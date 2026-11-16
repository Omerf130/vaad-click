import { z } from "zod";

import {
  STATEMENT_OF_CLAIM_SECTION_TITLE_HE,
  STATEMENT_OF_CLAIM_TEMPLATE_SECTION_ORDER,
  StatementOfClaimTemplateSectionId,
} from "@/modules/statement-of-claim-templates/domain/statement-of-claim-template-section";
import {
  validateStatementOfClaimPlaceholderTokens,
} from "@/modules/statement-of-claim-templates/domain/statement-of-claim-placeholder-registry";

export const STATEMENT_OF_CLAIM_TEMPLATE_BODY_FORMAT_VERSION = 1 as const;

export const STATEMENT_OF_CLAIM_DEV_ONLY_BANNER_HE =
  "DEVELOPMENT ONLY — תבנית מבנה לפיתוח בלבד. אין ניסוח משפטי מאושר. אין לפרסם או להפיק כתב תביעה מבצעי.";

const sectionSchema = z.object({
  titleHe: z.string().min(1).max(200),
  bodyTemplate: z.string().max(50_000),
});

export const statementOfClaimTemplateBodySchema = z.object({
  formatVersion: z.literal(STATEMENT_OF_CLAIM_TEMPLATE_BODY_FORMAT_VERSION),
  developmentOnlyMarker: z.literal(true).optional(),
  sections: z.record(z.string(), sectionSchema),
});

export type StatementOfClaimTemplateBody = z.infer<typeof statementOfClaimTemplateBodySchema>;

export type StatementOfClaimTemplateValidationIssue = {
  code: string;
  messageHe: string;
};

export function serializeStatementOfClaimTemplateBody(body: StatementOfClaimTemplateBody): string {
  return JSON.stringify(body);
}

export function parseStatementOfClaimTemplateBody(
  raw: string,
): { ok: true; body: StatementOfClaimTemplateBody } | { ok: false; issues: StatementOfClaimTemplateValidationIssue[] } {
  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch {
    return {
      ok: false,
      issues: [{ code: "invalid_json", messageHe: "מבנה התבנית אינו JSON תקין." }],
    };
  }
  const parsed = statementOfClaimTemplateBodySchema.safeParse(json);
  if (!parsed.success) {
    return {
      ok: false,
      issues: [{ code: "schema", messageHe: "מבנה תבנית כתב תביעה אינו תואם גרסה נתמכת." }],
    };
  }
  return { ok: true, body: parsed.data };
}

export function validateStatementOfClaimTemplateBodyStructure(
  body: StatementOfClaimTemplateBody,
): StatementOfClaimTemplateValidationIssue[] {
  const issues: StatementOfClaimTemplateValidationIssue[] = [];

  for (const sectionId of STATEMENT_OF_CLAIM_TEMPLATE_SECTION_ORDER) {
    if (!body.sections[sectionId]) {
      issues.push({
        code: "missing_section",
        messageHe: `חסר מקטע מבני: ${STATEMENT_OF_CLAIM_SECTION_TITLE_HE[sectionId]}.`,
      });
    }
  }

  for (const [sectionId, section] of Object.entries(body.sections)) {
    const placeholderCheck = validateStatementOfClaimPlaceholderTokens(section.bodyTemplate);
    if (!placeholderCheck.ok) {
      issues.push({
        code: "unknown_placeholder",
        messageHe: `מצייני מקום לא מוכרים במקטע ${sectionId}: ${placeholderCheck.unknownTokens.join(", ")}`,
      });
    }
  }

  return issues;
}

export function buildDevelopmentStatementOfClaimTemplateBody(): StatementOfClaimTemplateBody {
  const sections: StatementOfClaimTemplateBody["sections"] = {};

  const devSection = (sectionId: StatementOfClaimTemplateSectionId, hint: string): void => {
    sections[sectionId] = {
      titleHe: STATEMENT_OF_CLAIM_SECTION_TITLE_HE[sectionId],
      bodyTemplate: `${STATEMENT_OF_CLAIM_DEV_ONLY_BANNER_HE}\n${hint}`,
    };
  };

  devSection(
    StatementOfClaimTemplateSectionId.COURT_JURISDICTION,
    "מקום לבית משפט ולאזור שיפוט — יוזן על ידי עורך הדין.",
  );
  devSection(
    StatementOfClaimTemplateSectionId.PLAINTIFF,
    "תובע/ת: נציגות — פרטים יוזנו בעתיד מנתוני בניין.",
  );
  devSection(StatementOfClaimTemplateSectionId.DEFENDANT, "נתבע/ת: {{debtor_name}}");
  devSection(
    StatementOfClaimTemplateSectionId.PROPERTY_BUILDING,
    "כתובת: {{building_address}} · סימוכין: {{debt_case_reference}}",
  );
  devSection(
    StatementOfClaimTemplateSectionId.DEBT_PERIOD,
    "תקופה: {{debt_period}} · קרן בתיק: {{original_principal_nis}} ₪",
  );
  devSection(
    StatementOfClaimTemplateSectionId.STATEMENT_OF_FACTS,
    "[מקום לעובדות — ללא טקסט משפטי מומצא. ניתן לשלב נתונים עובדתיים בלבד.]",
  );
  devSection(
    StatementOfClaimTemplateSectionId.LEGAL_GROUNDS,
    "[מקום לבסיס משפטי — מילוי עורך דין בלבד.]",
  );
  devSection(
    StatementOfClaimTemplateSectionId.FINANCIAL_BREAKDOWN,
    "במכתב התראה (קפוא): {{warning_letter_amount_nis}} ₪ · תשלומים מתועדים: {{reported_payments_nis}} ₪ · יתרה לפי תיעוד: {{outstanding_balance_nis}} ₪.\nסכום תביעה: {{claim_amount_lawyer}} · ריבית/הצמדה: {{interest_lawyer}} · הוצאות: {{expenses_lawyer}}",
  );
  devSection(
    StatementOfClaimTemplateSectionId.WARNING_LETTER_DELIVERY,
    "מכתב התראה מיום {{warning_letter_date}} — פרטי משלוח יתווספו בעתיד ממערכת המשלוח.",
  );
  devSection(
    StatementOfClaimTemplateSectionId.EXHIBITS,
    "[רשימת נספחים — קישור למסמכי תיק בעתיד.]",
  );
  devSection(
    StatementOfClaimTemplateSectionId.REQUESTED_RELIEF,
    "סעד מבוקש: {{requested_relief_lawyer}}",
  );
  devSection(
    StatementOfClaimTemplateSectionId.LAWYER_SIGNATURE,
    "[פרטי עורך דין וחתימה — בהמשך.]",
  );

  return {
    formatVersion: STATEMENT_OF_CLAIM_TEMPLATE_BODY_FORMAT_VERSION,
    developmentOnlyMarker: true,
    sections,
  };
}

export function renderStatementOfClaimTemplatePlainPreview(body: StatementOfClaimTemplateBody): string {
  const parts: string[] = [STATEMENT_OF_CLAIM_DEV_ONLY_BANNER_HE, ""];
  for (const sectionId of STATEMENT_OF_CLAIM_TEMPLATE_SECTION_ORDER) {
    const section = body.sections[sectionId];
    if (!section) {
      continue;
    }
    parts.push(`## ${section.titleHe}`);
    parts.push(section.bodyTemplate);
    parts.push("");
  }
  return parts.join("\n");
}