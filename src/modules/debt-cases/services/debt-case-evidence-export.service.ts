import "server-only";

import { DocumentAsset } from "@/modules/document-assets/infra/document-asset.model";
import { DocumentOwnerEntityType } from "@/modules/document-assets/domain/document-owner-entity-type";
import {
  authorizeDocumentAssetAccess,
  assertDocumentReadableByStatus,
  DocumentAssetAccessIntent,
} from "@/modules/document-assets/services/document-asset-authorization.service";
import { DocumentAssetStatus } from "@/modules/document-assets/domain/document-asset-status";
import { getDocumentStorageAdapter } from "@/modules/document-assets/infra/document-storage-registry";
import {
  buildingLegalDocumentPdfInputFromPreview,
  generateBuildingLegalDocumentPdfBuffer,
} from "@/modules/building-legal-documents/pdf/building-legal-document-pdf.service";
import { getBuildingLegalDocumentPreview } from "@/modules/building-legal-documents/services/building-legal-document.service";
import { assertLawyerAdminDebtCaseReview } from "@/modules/debt-cases/services/debt-case-authorization.service";
import { getDebtCase } from "@/modules/debt-cases/services/debt-case.service";
import { buildEvidenceZipArchive } from "@/modules/debt-cases/domain/build-evidence-zip-archive";
import {
  DEBT_CASE_EVIDENCE_EXPORT_MAX_BYTES,
  DEBT_CASE_EVIDENCE_EXPORT_MAX_FILES,
  DEBT_CASE_EVIDENCE_EXPORT_MAX_ZIP_BYTES,
  WARNING_LETTER_FINAL_PDF_REGEN_NOTE_HE,
} from "@/modules/debt-cases/domain/debt-case-evidence-export.constants";
import {
  DebtCaseEvidenceExportError,
  DebtCaseEvidenceExportErrorCode,
} from "@/modules/debt-cases/domain/debt-case-evidence-export.errors";
import {
  DebtCaseEvidenceAvailabilityStatus,
  DebtCaseEvidenceInventoryItemKind,
  parseEvidenceInventoryItemId,
  type DebtCaseEvidenceInventoryItem,
} from "@/modules/debt-cases/domain/debt-case-evidence-inventory.types";
import { formatHebrewExhibitLabel } from "@/modules/debt-cases/domain/debt-case-exhibit-labels.he";
import { safeExportZipEntryName } from "@/modules/debt-cases/domain/safe-export-filename";
import { buildDebtCaseEvidenceInventory } from "@/modules/debt-cases/services/debt-case-evidence-inventory.service";
import { recordDebtCaseEvidenceExportCreated } from "@/modules/debt-cases/services/debt-case-evidence-export-audit.service";
import { generateStatementOfClaimReviewPdfBuffer } from "@/modules/statement-of-claim-drafts/pdf/statement-of-claim-pdf.service";
import { StatementOfClaimDraft } from "@/modules/statement-of-claim-drafts/infra/statement-of-claim-draft.model";
import type { StatementOfClaimDraftContentSnapshot } from "@/modules/statement-of-claim-drafts/domain/statement-of-claim-draft-content-snapshot.types";
import { WarningLetterFinalDocumentStatus } from "@/modules/warning-letters/domain/warning-letter-final-document-status";
import { generateWarningLetterFinalPdfBuffer } from "@/modules/warning-letters/pdf/warning-letter-pdf.service";
import { loadWarningLetterFinalDocumentById } from "@/modules/warning-letters/services/warning-letter-finalization.service";
import type { AuthenticatedContext } from "@/shared/auth/get-authenticated-context";
import { connectMongo } from "@/shared/db/connect";

async function streamToBuffer(stream: ReadableStream<Uint8Array>): Promise<Buffer> {
  const reader = stream.getReader();
  const parts: Buffer[] = [];
  for (;;) {
    const { done, value } = await reader.read();
    if (done) {
      break;
    }
    if (value) {
      parts.push(Buffer.from(value));
    }
  }
  return Buffer.concat(parts);
}

function validateOrderedSelection(orderedItemIds: string[]): string[] {
  const unique = new Set<string>();
  for (const id of orderedItemIds) {
    if (unique.has(id)) {
      throw new DebtCaseEvidenceExportError(
        DebtCaseEvidenceExportErrorCode.DUPLICATE_SELECTION,
        "Duplicate inventory item",
        "נבחר אותו מסמך פעמיים.",
      );
    }
    unique.add(id);
  }
  if (orderedItemIds.length === 0) {
    throw new DebtCaseEvidenceExportError(
      DebtCaseEvidenceExportErrorCode.VALIDATION,
      "No items selected",
      "יש לבחור לפחות מסמך אחד לייצוא.",
    );
  }
  if (orderedItemIds.length > DEBT_CASE_EVIDENCE_EXPORT_MAX_FILES) {
    throw new DebtCaseEvidenceExportError(
      DebtCaseEvidenceExportErrorCode.SIZE_LIMIT,
      "Too many files",
      `לא ניתן לייצא יותר מ-${DEBT_CASE_EVIDENCE_EXPORT_MAX_FILES} קבצים.`,
    );
  }
  return orderedItemIds;
}

async function resolveExportFileBuffer(input: {
  context: AuthenticatedContext;
  debtCaseId: string;
  buildingId: string;
  item: DebtCaseEvidenceInventoryItem;
}): Promise<{ data: Buffer; extension: string }> {
  if (input.item.availability !== DebtCaseEvidenceAvailabilityStatus.AVAILABLE) {
    throw new DebtCaseEvidenceExportError(
      DebtCaseEvidenceExportErrorCode.MISSING_FILE,
      "Item unavailable",
      `${input.item.displayNameHe}: ${input.item.availabilityDetailHe ?? "לא זמין"}`,
    );
  }

  const parsed = parseEvidenceInventoryItemId(input.item.inventoryItemId);
  if (!parsed) {
    throw new DebtCaseEvidenceExportError(
      DebtCaseEvidenceExportErrorCode.VALIDATION,
      "Invalid item id",
    );
  }

  switch (parsed.kind) {
    case DebtCaseEvidenceInventoryItemKind.DOCUMENT_ASSET: {
      await connectMongo();
      const document = await DocumentAsset.findOne({
        documentAssetId: parsed.sourceRefId,
        deletedAt: null,
      }).lean();
      if (!document || document.buildingId !== input.buildingId) {
        throw new DebtCaseEvidenceExportError(
          DebtCaseEvidenceExportErrorCode.CROSS_CASE,
          "Document not in case scope",
          "מסמך אינו שייך לתיק.",
        );
      }
      if (
        document.ownerEntityType === DocumentOwnerEntityType.DEBT_CASE &&
        document.ownerEntityId !== input.debtCaseId
      ) {
        throw new DebtCaseEvidenceExportError(
          DebtCaseEvidenceExportErrorCode.CROSS_CASE,
          "Cross case document",
          "מסמך אינו שייך לתיק זה.",
        );
      }
      await authorizeDocumentAssetAccess({
        context: input.context,
        document,
        intent: DocumentAssetAccessIntent.READ,
        lawyerAdminBuildingWorkflow: true,
      });
      assertDocumentReadableByStatus(document.status as DocumentAssetStatus);
      if (!document.storageKey) {
        throw new DebtCaseEvidenceExportError(
          DebtCaseEvidenceExportErrorCode.MISSING_FILE,
          "No storage key",
          "קובץ המסמך אינו זמין באחסון.",
        );
      }
      const stream = await getDocumentStorageAdapter().readObjectStream(document.storageKey);
      const data = await streamToBuffer(stream);
      const ext =
        document.originalFilename?.split(".").pop()?.toLowerCase()?.slice(0, 8) || "bin";
      return { data, extension: ext };
    }
    case DebtCaseEvidenceInventoryItemKind.WARNING_LETTER_FINAL_PDF: {
      const loaded = await loadWarningLetterFinalDocumentById({
        debtCaseId: input.debtCaseId,
        finalDocumentId: parsed.sourceRefId,
      });
      if (!loaded) {
        throw new DebtCaseEvidenceExportError(
          DebtCaseEvidenceExportErrorCode.MISSING_FILE,
          "Final letter missing",
          "מכתב התראה סופי לא נמצא.",
        );
      }
      if (loaded.status !== WarningLetterFinalDocumentStatus.READY_FOR_DELIVERY) {
        throw new DebtCaseEvidenceExportError(
          DebtCaseEvidenceExportErrorCode.MISSING_FILE,
          "Final pdf not ready",
          "PDF מכתב סופי אינו זמין.",
        );
      }
      const data = await generateWarningLetterFinalPdfBuffer({
        snapshot: loaded.snapshot,
        draftRevision: loaded.draftRevision,
      });
      return { data, extension: "pdf" };
    }
    case DebtCaseEvidenceInventoryItemKind.STATEMENT_OF_CLAIM_REVIEW_PDF: {
      await connectMongo();
      const draft = await StatementOfClaimDraft.findOne({
        debtCaseId: input.debtCaseId,
        draftId: parsed.sourceRefId,
      }).lean();
      if (!draft) {
        throw new DebtCaseEvidenceExportError(
          DebtCaseEvidenceExportErrorCode.MISSING_FILE,
          "SOC draft missing",
        );
      }
      const data = await generateStatementOfClaimReviewPdfBuffer({
        snapshot: draft.contentSnapshot as StatementOfClaimDraftContentSnapshot,
        draftRevision: draft.draftRevision,
      });
      return { data, extension: "pdf" };
    }
    case DebtCaseEvidenceInventoryItemKind.BUILDING_LEGAL_DOCUMENT_PDF: {
      const preview = await getBuildingLegalDocumentPreview({
        context: input.context,
        expectedBuildingId: input.buildingId,
        buildingLegalDocumentId: parsed.sourceRefId,
      });
      const pdfInput = buildingLegalDocumentPdfInputFromPreview(preview);
      const data = await generateBuildingLegalDocumentPdfBuffer(pdfInput);
      return { data, extension: "pdf" };
    }
    default:
      throw new DebtCaseEvidenceExportError(
        DebtCaseEvidenceExportErrorCode.VALIDATION,
        "Unknown kind",
      );
  }
}

export async function buildDebtCaseEvidenceExportZip(input: {
  context: AuthenticatedContext;
  debtCaseId: string;
  orderedInventoryItemIds: string[];
  correlationId?: string;
}): Promise<{ zip: Buffer; filename: string }> {
  await assertLawyerAdminDebtCaseReview({ context: input.context });
  const debtCase = await getDebtCase({
    context: input.context,
    debtCaseId: input.debtCaseId,
  });

  const ordered = validateOrderedSelection(input.orderedInventoryItemIds);
  const inventory = await buildDebtCaseEvidenceInventory({
    context: input.context,
    debtCase,
  });

  const byId = new Map(inventory.items.map((row) => [row.inventoryItemId, row]));
  const selected: DebtCaseEvidenceInventoryItem[] = [];
  for (const id of ordered) {
    const item = byId.get(id);
    if (!item) {
      throw new DebtCaseEvidenceExportError(
        DebtCaseEvidenceExportErrorCode.VALIDATION,
        "Unknown inventory item",
        `פריט לא קיים במלאי התיק: ${id}`,
      );
    }
    selected.push(item);
  }

  let totalBytes = 0;
  const fileEntries: { path: string; data: Buffer; manifestRow: string }[] = [];

  for (let i = 0; i < selected.length; i += 1) {
    const item = selected[i]!;
    const exhibitLabel = formatHebrewExhibitLabel(i);
    const { data, extension } = await resolveExportFileBuffer({
      context: input.context,
      debtCaseId: input.debtCaseId,
      buildingId: debtCase.buildingId,
      item,
    });
    totalBytes += data.length;
    if (totalBytes > DEBT_CASE_EVIDENCE_EXPORT_MAX_BYTES) {
      throw new DebtCaseEvidenceExportError(
        DebtCaseEvidenceExportErrorCode.SIZE_LIMIT,
        "Export too large",
        "נפח החבילה חורג מהמגבלה.",
      );
    }
    const zipName = safeExportZipEntryName({
      exhibitLabel,
      suggestedBase: item.displayNameHe,
      extension,
    });
    const note =
      item.kind === DebtCaseEvidenceInventoryItemKind.WARNING_LETTER_FINAL_PDF
        ? ` · ${WARNING_LETTER_FINAL_PDF_REGEN_NOTE_HE}`
        : "";
    fileEntries.push({
      path: `files/${zipName}`,
      data,
      manifestRow: `${exhibitLabel}: ${item.displayNameHe} · ${item.categoryHe} · מקור: ${item.evidenceSource}${note}`,
    });
  }

  const generatedAt = new Date().toLocaleString("he-IL", { timeZone: "Asia/Jerusalem" });
  const manifestLines = [
    "מנהל נספחים — חבילת הכנה פנימית (לא להגשה)",
    inventory.disclaimerHe,
    `תיק: ${input.debtCaseId}`,
    `בניין: ${debtCase.buildingId}`,
    `הופק: ${generatedAt}`,
    "",
    "רשימת נספחים:",
    ...fileEntries.map((row) => row.manifestRow),
    "",
    "metadata.json — מזהי מקור בלבד, ללא מפתחות אחסון.",
  ];

  const metadata = {
    debtCaseId: input.debtCaseId,
    buildingId: debtCase.buildingId,
    generatedAtIso: new Date().toISOString(),
    nonOperative: true,
    exhibits: selected.map((item, index) => ({
      exhibitLabel: formatHebrewExhibitLabel(index),
      inventoryItemId: item.inventoryItemId,
      kind: item.kind,
      sourceRefId: item.sourceRefId,
      categoryHe: item.categoryHe,
      displayNameHe: item.displayNameHe,
      evidenceSource: item.evidenceSource,
    })),
  };

  const zipEntries = [
  ...fileEntries.map((row) => ({ path: row.path, data: row.data })),
    { path: "manifest.he.txt", data: Buffer.from(manifestLines.join("\n"), "utf8") },
    { path: "metadata.json", data: Buffer.from(JSON.stringify(metadata, null, 2), "utf8") },
  ];

  const zip = await buildEvidenceZipArchive(zipEntries);
  if (zip.length > DEBT_CASE_EVIDENCE_EXPORT_MAX_ZIP_BYTES) {
    throw new DebtCaseEvidenceExportError(
      DebtCaseEvidenceExportErrorCode.SIZE_LIMIT,
      "Zip too large",
      "גודל קובץ ה-ZIP חורג מהמגבלה.",
    );
  }

  await recordDebtCaseEvidenceExportCreated({
    context: input.context,
    debtCaseId: input.debtCaseId,
    buildingId: debtCase.buildingId,
    inventoryItemIds: ordered,
    correlationId: input.correlationId,
  });

  const filename = `evidence-export-${input.debtCaseId.slice(0, 8)}-${Date.now()}.zip`;
  return { zip, filename };
}