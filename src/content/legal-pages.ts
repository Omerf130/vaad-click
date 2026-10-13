/**
 * Planned public legal routes — content pending lawyer approval.
 * Do not link to these routes until `contentStatus` is `approved` and pages exist.
 */

export type LegalPageContentStatus = "pending_lawyer" | "approved";

export type PlannedLegalPage = {
  slug: "privacy" | "terms" | "advertising-disclosure";
  route: `/legal/${string}`;
  hebrewTitle: string;
  requiredBeforeLaunch: boolean;
  contentStatus: LegalPageContentStatus;
};

export const PLANNED_LEGAL_PAGES: readonly PlannedLegalPage[] = [
  {
    slug: "privacy",
    route: "/legal/privacy",
    hebrewTitle: "מדיניות פרטיות",
    requiredBeforeLaunch: true,
    contentStatus: "pending_lawyer",
  },
  {
    slug: "terms",
    route: "/legal/terms",
    hebrewTitle: "תנאי שימוש",
    requiredBeforeLaunch: true,
    contentStatus: "pending_lawyer",
  },
  {
    slug: "advertising-disclosure",
    route: "/legal/advertising-disclosure",
    hebrewTitle: "גילוי נאות — פרסום משפטי",
    requiredBeforeLaunch: true,
    contentStatus: "pending_lawyer",
  },
] as const;

export const LEGAL_CONTENT_BLOCKERS = [
  "Privacy policy text (Hebrew) approved by lawyer / DPO review",
  "Terms of use approved by lawyer",
  "Bar association advertising compliance review for all public marketing copy",
  "Approved firm contact details before displaying phone, email or office addresses",
] as const;
