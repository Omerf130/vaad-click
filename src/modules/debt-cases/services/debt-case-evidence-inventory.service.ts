import "server-only";

import { legalDocumentTemplateCategoryLabelHe } from "@/modules/legal-document-templates/domain/legal-document-template-category";
import { BUILDING_LEGAL_DOCUMENT_TEMPLATE_CATEGORIES } from "@/modules/legal-document-templates/domain/legal-document-template-category";
import { BuildingLegalDocument } from "@/modules/building-legal-documents/infra/building-legal-document.model";
import { BuildingLegalDocumentStatus } from "@/modules/building-legal-documents/domain/building-legal-document-status";
import { DocumentAsset } from "@/modules/document-assets/infra/document-asset.model";
import { DocumentOwnerEntityType } from "@/modules/document-assets/domain/document-owner-entity-type";
import { isDownloadableDocumentStatus } from "@/modules/document-assets/domain/document-asset-status";
import { formatDocumentClassificationHe } from "@/modules/document-assets/presentation/document-messages.he";
import { getDocumentStorageCapability } from "@/modules/document-assets/infra/document-storage-registry";
import type { DebtCaseRecord } from "@/modules/debt-cases/domain/debt-case-record.types";
import {
  DEBT_CASE_EVIDENCE_EXPORT_DISCLAIMER_HE,
} from "@/modules/debt-cases/domain/debt-case-evidence-export.constants";
import {
  DebtCaseEvidenceAvailabilityStatus,
  DebtCaseEvidenceInventoryItemKind,
  DebtCaseEvidenceSource,
  buildEvidenceInventoryItemId,
  type DebtCaseEvidenceInventoryItem,
  type DebtCaseEvidenceInventoryView,
} from "@/modules/debt-cases/domain/debt-case-evidence-inventory.types";
import { assertLawyerAdminDebtCaseReview } from "@/modules/debt-cases/services/debt-case-authorization.service";
import { DebtCaseManualPayment } from "@/modules/debt-cases/infra/debt-case-manual-payment.model";
import { StatementOfClaimDraft } from "@/modules/statement-of-claim-drafts/infra/statement-of-claim-draft.model";
import { StatementOfClaimDraftStatus } from "@/modules/statement-of-claim-drafts/domain/statement-of-claim-draft-status";
import { WarningLetterDeliveryRecord } from "@/modules/warning-letters/infra/warning-letter-delivery-record.model";
import { loadWarningLetterFinalDocumentForCase } from "@/modules/warning-letters/services/warning-letter-finalization.service";
import { WarningLetterFinalDocumentStatus } from "@/modules/warning-letters/domain/warning-letter-final-document-status";
import type { AuthenticatedContext } from "@/shared/auth/get-authenticated-context";
import { connectMongo } from "@/shared/db/connect";

function assetAvailability(status: string): {
  availability: DebtCaseEvidenceAvailabilityStatus;
  detailHe: string | null;
} {
  if (!isDownloadableDocumentStatus(status as never)) {
    return {
      availability: DebtCaseEvidenceAvailabilityStatus.UNAVAILABLE_STATUS,
      detailHe: "המסמך אינו בסטטוס זמין להורדה.",
    };
  }
  const storage = getDocumentStorageCapability();
  if (storage.state !== "configured") {
    return {
      availability: DebtCaseEvidenceAvailabilityStatus.UNAVAILABLE_STORAGE,
      detailHe: "אחסון מסמכים אינו מוגדר — לא ניתן לשלוף קובץ.",
    };
  }
  return { availability: DebtCaseEvidenceAvailabilityStatus.AVAILABLE, detailHe: null };
}

export async function buildDebtCaseEvidenceInventory(input: {
  context: AuthenticatedContext;
  debtCase: DebtCaseRecord;
}): Promise<DebtCaseEvidenceInventoryView> {
  await assertLawyerAdminDebtCaseReview({ context: input.context });
  await connectMongo();

  const items: DebtCaseEvidenceInventoryItem[] = [];
  const seenAssetIds = new Set<string>();

  const pushAsset = (
    row: {
      documentAssetId: string;
      classification: string;
      status: string;
      createdAt: Date;
      originalFilename?: string | null;
      byteSize?: number | null;
    },
    source: (typeof DebtCaseEvidenceSource)[keyof typeof DebtCaseEvidenceSource],
    descriptionHe: string | null,
  ) => {
    if (seenAssetIds.has(row.documentAssetId)) {
      return;
    }
    seenAssetIds.add(row.documentAssetId);
    const { availability, detailHe } = assetAvailability(row.status);
    const classification = row.classification as never;
    items.push({
      inventoryItemId: buildEvidenceInventoryItemId(
        DebtCaseEvidenceInventoryItemKind.DOCUMENT_ASSET,
        row.documentAssetId,
      ),
      kind: DebtCaseEvidenceInventoryItemKind.DOCUMENT_ASSET,
      sourceRefId: row.documentAssetId,
      categoryHe: formatDocumentClassificationHe(classification),
      displayNameHe:
        row.originalFilename?.trim() || formatDocumentClassificationHe(classification),
      availability,
      availabilityDetailHe: detailHe,
      relevantDateIso: row.createdAt.toISOString(),
      evidenceSource: source,
      descriptionHe,
      byteSizeHint: row.byteSize ?? null,
    });
  };

  const caseDocs = await DocumentAsset.find({
    buildingId: input.debtCase.buildingId,
    ownerEntityType: DocumentOwnerEntityType.DEBT_CASE,
    ownerEntityId: input.debtCase.debtCaseId,
    deletedAt: null,
  })
    .sort({ createdAt: -1 })
    .lean();

  for (const row of caseDocs) {
    pushAsset(row, DebtCaseEvidenceSource.DEBT_CASE_UPLOAD, null);
  }

  const payments = await DebtCaseManualPayment.find({ debtCaseId: input.debtCase.debtCaseId }).lean();
  for (const payment of payments) {
    if (!payment.evidenceDocumentAssetId) {
      continue;
    }
    const doc = await DocumentAsset.findOne({
      documentAssetId: payment.evidenceDocumentAssetId,
      buildingId: input.debtCase.buildingId,
    }).lean();
    if (doc) {
      pushAsset(
        doc,
        DebtCaseEvidenceSource.MANUAL_PAYMENT,
        `ראיה לתשלום מתועד · ${payment.paymentEntryId}`,
      );
    }
  }

  const deliveries = await WarningLetterDeliveryRecord.find({
    debtCaseId: input.debtCase.debtCaseId,
  }).lean();
  for (const delivery of deliveries) {
    if (!delivery.evidenceDocumentAssetId) {
      continue;
    }
    const doc = await DocumentAsset.findOne({
      documentAssetId: delivery.evidenceDocumentAssetId,
      buildingId: input.debtCase.buildingId,
    }).lean();
    if (doc) {
      pushAsset(
        doc,
        DebtCaseEvidenceSource.DELIVERY_RECORD,
        `ראיה למשלוח · ${delivery.deliveryRecordId}`,
      );
    }
  }

  for (const category of BUILDING_LEGAL_DOCUMENT_TEMPLATE_CATEGORIES) {
    const instance = await BuildingLegalDocument.findOne({
      buildingId: input.debtCase.buildingId,
      category,
      status: BuildingLegalDocumentStatus.GENERATED_PENDING_SIGNATURE,
    }).lean();
    if (!instance) {
      continue;
    }
    items.push({
      inventoryItemId: buildEvidenceInventoryItemId(
        DebtCaseEvidenceInventoryItemKind.BUILDING_LEGAL_DOCUMENT_PDF,
        instance.buildingLegalDocumentId,
      ),
      kind: DebtCaseEvidenceInventoryItemKind.BUILDING_LEGAL_DOCUMENT_PDF,
      sourceRefId: instance.buildingLegalDocumentId,
      categoryHe: legalDocumentTemplateCategoryLabelHe(category),
      displayNameHe: `${legalDocumentTemplateCategoryLabelHe(category)} (בניין)`,
      availability: DebtCaseEvidenceAvailabilityStatus.AVAILABLE,
      availabilityDetailHe: null,
      relevantDateIso: instance.createdAt?.toISOString() ?? null,
      evidenceSource: DebtCaseEvidenceSource.BUILDING_LEGAL,
      descriptionHe: "מסמך משפטי ברמת בניין — PDF יופק מחדש מהגרסה השמורה.",
      byteSizeHint: null,
    });
  }

  const finalDoc = await loadWarningLetterFinalDocumentForCase(input.debtCase.debtCaseId);
  if (finalDoc) {
    const pdfReady = finalDoc.status === WarningLetterFinalDocumentStatus.READY_FOR_DELIVERY;
    items.push({
      inventoryItemId: buildEvidenceInventoryItemId(
        DebtCaseEvidenceInventoryItemKind.WARNING_LETTER_FINAL_PDF,
        finalDoc.finalDocumentId,
      ),
      kind: DebtCaseEvidenceInventoryItemKind.WARNING_LETTER_FINAL_PDF,
      sourceRefId: finalDoc.finalDocumentId,
      categoryHe: "מכתב התראה סופי",
      displayNameHe: `מכתב התראה סופי · ${finalDoc.letterCaseReference}`,
      availability: pdfReady
        ? DebtCaseEvidenceAvailabilityStatus.AVAILABLE
        : DebtCaseEvidenceAvailabilityStatus.UNAVAILABLE_STATUS,
      availabilityDetailHe: pdfReady
        ? null
        : "מכתב סופי קיים אך PDF אינו זמין במצב הנוכחי.",
      relevantDateIso: finalDoc.finalizedAtIso,
      evidenceSource: DebtCaseEvidenceSource.WARNING_LETTER_FINAL,
      descriptionHe:
        "תוכן קפוא במערכת — הבייטים של ה-PDF נוצרים מחדש ואינם ארכיון בינארי מקורי.",
      byteSizeHint: null,
    });
  }

  const socActive = await StatementOfClaimDraft.findOne({
    debtCaseId: input.debtCase.debtCaseId,
    status: StatementOfClaimDraftStatus.ACTIVE,
  }).lean();

  if (socActive) {
    items.push({
      inventoryItemId: buildEvidenceInventoryItemId(
        DebtCaseEvidenceInventoryItemKind.STATEMENT_OF_CLAIM_REVIEW_PDF,
        socActive.draftId,
      ),
      kind: DebtCaseEvidenceInventoryItemKind.STATEMENT_OF_CLAIM_REVIEW_PDF,
      sourceRefId: socActive.draftId,
      categoryHe: "כתב תביעה — טיוטת פיתוח",
      displayNameHe: `כתב תביעה טיוטה · גרסה ${socActive.draftRevision}`,
      availability: DebtCaseEvidenceAvailabilityStatus.AVAILABLE,
      availabilityDetailHe: null,
      relevantDateIso: socActive.createdAt?.toISOString() ?? null,
      evidenceSource: DebtCaseEvidenceSource.STATEMENT_OF_CLAIM_DRAFT,
      descriptionHe: "PDF לבדיקה עם סימן מים — אינו כתב תביעה מבצעי.",
      byteSizeHint: null,
    });
  }

  return {
    debtCaseId: input.debtCase.debtCaseId,
    buildingId: input.debtCase.buildingId,
    disclaimerHe: DEBT_CASE_EVIDENCE_EXPORT_DISCLAIMER_HE,
    items,
  };
}