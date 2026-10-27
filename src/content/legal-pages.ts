/**
 * Public legal document routes and publication state.
 * No fabricated policy text — draft pages show a non-final placeholder only.
 */

export type LegalDocumentPublicationStatus = "draft_pending_approval";

export type LegalDocumentDefinition = {
  path: `/privacy` | `/terms` | `/accessibility`;
  title: string;
  shortTitle: string;
  publicationStatus: LegalDocumentPublicationStatus;
  draftNoticeTitle: string;
  draftNoticeBody: string;
};

export const legalDocuments = {
  privacy: {
    path: "/privacy",
    title: "מדיניות פרטיות",
    shortTitle: "פרטיות",
    publicationStatus: "draft_pending_approval",
    draftNoticeTitle: "טיוטה — טרם אושרה לפרסום",
    draftNoticeBody:
      "מסמך מדיניות הפרטיות המחייב עדיין בעריכה ואישור משפטי. עד לפרסום הגרסה הסופית, המידע כאן הוא להסבר בלבד ואינו מהווה הסכם.",
  },
  terms: {
    path: "/terms",
    title: "תנאי שימוש",
    shortTitle: "תנאים",
    publicationStatus: "draft_pending_approval",
    draftNoticeTitle: "טיוטה — טרם אושרה לפרסום",
    draftNoticeBody:
      "תנאי השימוש המחייבים עדיין בעריכה ואישור משפטי. עד לפרסום הגרסה הסופית, המידע כאן הוא להסבר בלבד ואינו מהווה הסכם.",
  },
  accessibility: {
    path: "/accessibility",
    title: "הצהרת נגישות",
    shortTitle: "נגישות",
    publicationStatus: "draft_pending_approval",
    draftNoticeTitle: "טיוטה — טרם אושרה לפרסום",
    draftNoticeBody:
      "הצהרת נגישות מלאה תפורסם לאחר בדיקה ואימות. אין לראות במסמך זה הצהרה על עמידה בתקן לפני שהושלמה הבדיקה.",
  },
} as const satisfies Record<string, LegalDocumentDefinition>;

export const legalDocumentList = [
  legalDocuments.privacy,
  legalDocuments.terms,
  legalDocuments.accessibility,
] as const;
