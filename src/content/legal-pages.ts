/**
 * Public legal document routes and publication state.
 */

import {
  accessibilityStatementHasAuthoritativeBody,
} from "@/content/legal/accessibility-statement.body";
import { termsOfUseHasAuthoritativeBody } from "@/content/legal/terms-of-use.body";

export type LegalDocumentPublicationStatus =
  | "draft_pending_approval"
  | "published";

export type LegalDocumentDefinition = {
  path: `/privacy` | `/terms` | `/accessibility`;
  title: string;
  shortTitle: string;
  publicationStatus: LegalDocumentPublicationStatus;
  hasAuthoritativeBody: boolean;
  /** When false, public page shows counsel body only (no draft chrome). */
  showDraftChrome: boolean;
  draftNoticeTitle: string;
  draftNoticeBody: string;
  seoDescription: string;
};

const termsHasBody = termsOfUseHasAuthoritativeBody();
const accessibilityHasBody = accessibilityStatementHasAuthoritativeBody();

export const legalDocuments = {
  privacy: {
    path: "/privacy",
    title: "מדיניות פרטיות",
    shortTitle: "פרטיות",
    publicationStatus: "draft_pending_approval",
    hasAuthoritativeBody: false,
    showDraftChrome: true,
    draftNoticeTitle: "טיוטה — טרם אושרה לפרסום",
    draftNoticeBody:
      "מסמך מדיניות הפרטיות המחייב עדיין בעריכה ואישור משפטי. עד לפרסום הגרסה הסופית, המידע כאן הוא להסבר בלבד ואינו מהווה הסכם.",
    seoDescription:
      "מדיניות פרטיות VaadClick (ועד בקליק) — טיוטה הממתינה לאישור משפטי.",
  },
  terms: {
    path: "/terms",
    title: "תנאי שימוש",
    shortTitle: "תנאים",
    publicationStatus: termsHasBody ? "published" : "draft_pending_approval",
    hasAuthoritativeBody: termsHasBody,
    showDraftChrome: !termsHasBody,
    draftNoticeTitle: "טיוטה — טרם אושרה לפרסום",
    draftNoticeBody:
      "תנאי השימוש המחייבים עדיין בעריכה ואישור משפטי. עד לפרסום הגרסה הסופית, המידע כאן הוא להסבר בלבד ואינו מהווה הסכם.",
    seoDescription:
      "תנאי שימוש לשירות ועד בקליק — תהליך משפטי לגביית חובות ועד בית בפיקוח עורך דין.",
  },
  accessibility: {
    path: "/accessibility",
    title: "הצהרת נגישות",
    shortTitle: "נגישות",
    publicationStatus: accessibilityHasBody ? "published" : "draft_pending_approval",
    hasAuthoritativeBody: accessibilityHasBody,
    showDraftChrome: !accessibilityHasBody,
    draftNoticeTitle: "טיוטה — טרם הושלמה",
    draftNoticeBody:
      "הצהרת נגישות מלאה תפורסם לאחר בדיקה ואימות.",
    seoDescription:
      "הצהרת נגישות לאתר ועד בקליק — מחויבות, התאמות, מגבלות ודרכי פנייה.",
  },
} as const satisfies Record<string, LegalDocumentDefinition>;

export const legalDocumentList = [
  legalDocuments.privacy,
  legalDocuments.terms,
  legalDocuments.accessibility,
] as const;
