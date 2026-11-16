/**
 * Typed placeholders for factual auto-fill (future) and lawyer-controlled fields.
 * Claim amounts / interest / relief are lawyer-controlled — not mapped from warning letter total.
 */

export const StatementOfClaimPlaceholderId = {
  DEBT_CASE_REFERENCE: "debt_case_reference",
  BUILDING_ADDRESS: "building_address",
  DEBTOR_NAME: "debtor_name",
  DEBT_PERIOD: "debt_period",
  ORIGINAL_PRINCIPAL_NIS: "original_principal_nis",
  WARNING_LETTER_DATE: "warning_letter_date",
  WARNING_LETTER_AMOUNT_NIS: "warning_letter_amount_nis",
  REPORTED_PAYMENTS_NIS: "reported_payments_nis",
  OUTSTANDING_BALANCE_NIS: "outstanding_balance_nis",
  CLAIM_AMOUNT_LAWYER: "claim_amount_lawyer",
  INTEREST_LAWYER: "interest_lawyer",
  EXPENSES_LAWYER: "expenses_lawyer",
  REQUESTED_RELIEF_LAWYER: "requested_relief_lawyer",
} as const;

export type StatementOfClaimPlaceholderId =
  (typeof StatementOfClaimPlaceholderId)[keyof typeof StatementOfClaimPlaceholderId];

export type StatementOfClaimPlaceholderKind = "factual" | "lawyer_controlled";

export type StatementOfClaimPlaceholderDefinition = {
  id: StatementOfClaimPlaceholderId;
  token: string;
  labelHe: string;
  kind: StatementOfClaimPlaceholderKind;
  samplePreviewValue: string;
};

const PLACEHOLDER_DEFINITIONS: readonly StatementOfClaimPlaceholderDefinition[] = [
  {
    id: StatementOfClaimPlaceholderId.DEBT_CASE_REFERENCE,
    token: "{{debt_case_reference}}",
    labelHe: "סימוכין תיק",
    kind: "factual",
    samplePreviewValue: "WH-2026-000042",
  },
  {
    id: StatementOfClaimPlaceholderId.BUILDING_ADDRESS,
    token: "{{building_address}}",
    labelHe: "כתובת בניין",
    kind: "factual",
    samplePreviewValue: "רחוב דוגמה 1, תל אביב",
  },
  {
    id: StatementOfClaimPlaceholderId.DEBTOR_NAME,
    token: "{{debtor_name}}",
    labelHe: "שם חייב",
    kind: "factual",
    samplePreviewValue: "ישראל ישראלי",
  },
  {
    id: StatementOfClaimPlaceholderId.DEBT_PERIOD,
    token: "{{debt_period}}",
    labelHe: "תקופת חוב",
    kind: "factual",
    samplePreviewValue: "2024-01 – 2024-06",
  },
  {
    id: StatementOfClaimPlaceholderId.ORIGINAL_PRINCIPAL_NIS,
    token: "{{original_principal_nis}}",
    labelHe: "קרן מקורית (תיק)",
    kind: "factual",
    samplePreviewValue: "1,500.00",
  },
  {
    id: StatementOfClaimPlaceholderId.WARNING_LETTER_DATE,
    token: "{{warning_letter_date}}",
    labelHe: "תאריך מכתב התראה סופי",
    kind: "factual",
    samplePreviewValue: "19.4.2026",
  },
  {
    id: StatementOfClaimPlaceholderId.WARNING_LETTER_AMOUNT_NIS,
    token: "{{warning_letter_amount_nis}}",
    labelHe: "סכום במכתב התראה (קפוא)",
    kind: "factual",
    samplePreviewValue: "1,850.00",
  },
  {
    id: StatementOfClaimPlaceholderId.REPORTED_PAYMENTS_NIS,
    token: "{{reported_payments_nis}}",
    labelHe: "תשלומים מתועדים",
    kind: "factual",
    samplePreviewValue: "500.00",
  },
  {
    id: StatementOfClaimPlaceholderId.OUTSTANDING_BALANCE_NIS,
    token: "{{outstanding_balance_nis}}",
    labelHe: "יתרה לפי תיעוד",
    kind: "factual",
    samplePreviewValue: "1,350.00",
  },
  {
    id: StatementOfClaimPlaceholderId.CLAIM_AMOUNT_LAWYER,
    token: "{{claim_amount_lawyer}}",
    labelHe: "סכום התביעה (עורך דין)",
    kind: "lawyer_controlled",
    samplePreviewValue: "[להשלמת עורך דין]",
  },
  {
    id: StatementOfClaimPlaceholderId.INTEREST_LAWYER,
    token: "{{interest_lawyer}}",
    labelHe: "ריבית והצמדה (עורך דין)",
    kind: "lawyer_controlled",
    samplePreviewValue: "[להשלמת עורך דין]",
  },
  {
    id: StatementOfClaimPlaceholderId.EXPENSES_LAWYER,
    token: "{{expenses_lawyer}}",
    labelHe: "הוצאות (עורך דין)",
    kind: "lawyer_controlled",
    samplePreviewValue: "[להשלמת עורך דין]",
  },
  {
    id: StatementOfClaimPlaceholderId.REQUESTED_RELIEF_LAWYER,
    token: "{{requested_relief_lawyer}}",
    labelHe: "סעד מבוקש (עורך דין)",
    kind: "lawyer_controlled",
    samplePreviewValue: "[להשלמת עורך דין]",
  },
];

export const STATEMENT_OF_CLAIM_PLACEHOLDER_REGISTRY: readonly StatementOfClaimPlaceholderDefinition[] =
  PLACEHOLDER_DEFINITIONS;

const TOKEN_SET = new Set(PLACEHOLDER_DEFINITIONS.map((row) => row.token));

const PLACEHOLDER_TOKEN_PATTERN = /\{\{([a-z0-9_]+)\}\}/g;

export function escapeStatementOfClaimPreviewValue(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function renderStatementOfClaimTemplateSectionPreviewHtml(sectionBody: string): string {
  let html = escapeStatementOfClaimPreviewValue(sectionBody);
  for (const def of PLACEHOLDER_DEFINITIONS) {
    const escapedSample = escapeStatementOfClaimPreviewValue(def.samplePreviewValue);
    html = html.split(def.token).join(`<mark>${escapedSample}</mark>`);
  }
  return html.replace(/\n/g, "<br />");
}

export function validateStatementOfClaimPlaceholderTokens(
  text: string,
): { ok: true } | { ok: false; unknownTokens: string[] } {
  const unknown: string[] = [];
  for (const match of text.matchAll(PLACEHOLDER_TOKEN_PATTERN)) {
    const full = `{{${match[1]}}}`;
    if (!TOKEN_SET.has(full)) {
      unknown.push(full);
    }
  }
  if (unknown.length > 0) {
    return { ok: false, unknownTokens: [...new Set(unknown)] };
  }
  return { ok: true };
}

export function statementOfClaimPlaceholderByToken(
  token: string,
): StatementOfClaimPlaceholderDefinition | undefined {
  return PLACEHOLDER_DEFINITIONS.find((row) => row.token === token);
}

const LAWYER_INCOMPLETE_HE = "[להשלמת עורך דין]";

/** Substitute factual placeholders only; lawyer-controlled tokens stay explicit placeholders. */
export function substituteStatementOfClaimFactualPlaceholders(
  text: string,
  factualValues: Readonly<Record<string, string>>,
): { rendered: string; incompleteLawyerTokens: string[] } {
  const incompleteLawyerTokens: string[] = [];
  let rendered = text;
  for (const def of PLACEHOLDER_DEFINITIONS) {
    if (def.kind === "factual") {
      const value = factualValues[def.id] ?? "—";
      rendered = rendered.split(def.token).join(value);
    } else {
      if (rendered.includes(def.token)) {
        incompleteLawyerTokens.push(def.token);
        rendered = rendered.split(def.token).join(LAWYER_INCOMPLETE_HE);
      }
    }
  }
  return { rendered, incompleteLawyerTokens };
}