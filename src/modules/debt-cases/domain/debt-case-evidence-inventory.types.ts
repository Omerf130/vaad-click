export const DebtCaseEvidenceInventoryItemKind = {
  DOCUMENT_ASSET: "document_asset",
  WARNING_LETTER_FINAL_PDF: "warning_letter_final_pdf",
  STATEMENT_OF_CLAIM_REVIEW_PDF: "statement_of_claim_review_pdf",
  BUILDING_LEGAL_DOCUMENT_PDF: "building_legal_document_pdf",
} as const;

export type DebtCaseEvidenceInventoryItemKind =
  (typeof DebtCaseEvidenceInventoryItemKind)[keyof typeof DebtCaseEvidenceInventoryItemKind];

export const DebtCaseEvidenceAvailabilityStatus = {
  AVAILABLE: "available",
  UNAVAILABLE_STORAGE: "unavailable_storage",
  UNAVAILABLE_STATUS: "unavailable_status",
  NOT_PRESENT: "not_present",
} as const;

export type DebtCaseEvidenceAvailabilityStatus =
  (typeof DebtCaseEvidenceAvailabilityStatus)[keyof typeof DebtCaseEvidenceAvailabilityStatus];

export const DebtCaseEvidenceSource = {
  DEBT_CASE_UPLOAD: "debt_case_upload",
  BUILDING_LEGAL: "building_legal",
  WARNING_LETTER_FINAL: "warning_letter_final",
  DELIVERY_RECORD: "delivery_record",
  MANUAL_PAYMENT: "manual_payment",
  STATEMENT_OF_CLAIM_DRAFT: "statement_of_claim_draft",
} as const;

export type DebtCaseEvidenceSource =
  (typeof DebtCaseEvidenceSource)[keyof typeof DebtCaseEvidenceSource];

export type DebtCaseEvidenceInventoryItem = {
  inventoryItemId: string;
  kind: DebtCaseEvidenceInventoryItemKind;
  sourceRefId: string;
  categoryHe: string;
  displayNameHe: string;
  availability: DebtCaseEvidenceAvailabilityStatus;
  availabilityDetailHe: string | null;
  relevantDateIso: string | null;
  evidenceSource: DebtCaseEvidenceSource;
  descriptionHe: string | null;
  byteSizeHint: number | null;
};

export type DebtCaseEvidenceInventoryView = {
  debtCaseId: string;
  buildingId: string;
  disclaimerHe: string;
  items: DebtCaseEvidenceInventoryItem[];
};

export function buildEvidenceInventoryItemId(
  kind: DebtCaseEvidenceInventoryItemKind,
  sourceRefId: string,
): string {
  return `${kind}:${sourceRefId}`;
}

export function parseEvidenceInventoryItemId(
  inventoryItemId: string,
): { kind: DebtCaseEvidenceInventoryItemKind; sourceRefId: string } | null {
  const idx = inventoryItemId.indexOf(":");
  if (idx <= 0) {
    return null;
  }
  const kind = inventoryItemId.slice(0, idx) as DebtCaseEvidenceInventoryItemKind;
  const sourceRefId = inventoryItemId.slice(idx + 1);
  if (!sourceRefId) {
    return null;
  }
  if (
    !(
      Object.values(DebtCaseEvidenceInventoryItemKind) as readonly string[]
    ).includes(kind)
  ) {
    return null;
  }
  return { kind, sourceRefId };
}