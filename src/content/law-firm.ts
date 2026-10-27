/**
 * Approved public law-firm identity and contact details (CP10).
 * Single source of truth — do not duplicate in components.
 */

export type LawFirmBranch = {
  id: "north" | "center";
  branchName: string;
  address: string;
  phoneDisplay: string;
  phoneTel: string;
};

export const lawFirmIdentity = {
  lawyerDisplayName: "עו״ד צבי הרשל אשכנזי",
  serviceContext: "שירות משפטי לניהול וטיפול בחובות ועדי בתים",
  productName: "ועד בקליק",
  operatedByLabel: "שירות VaadClick מופעל על ידי משרד עו״ד צבי הרשל אשכנזי",
  email: "azvika@gmail.com",
  businessHours: {
    label: "שעות פעילות",
    schedule: "ראשון–חמישי, 09:00–18:00",
  },
  branches: [
    {
      id: "north",
      branchName: "סניף צפון",
      address: "שד' ההסתדרות 285, חיפה",
      phoneDisplay: "077-9978330",
      phoneTel: "0779978330",
    },
    {
      id: "center",
      branchName: "סניף מרכז",
      address: "המסגר 35, תל אביב",
      phoneDisplay: "077-9973700",
      phoneTel: "0779973700",
    },
  ] satisfies LawFirmBranch[],
} as const;

/** Lawyer-proposed wording — subject to final bar-advertising review. */
export const lawFirmLegalServiceNotice =
  "הטיפול המשפטי מבוצע ומאושר על ידי עו״ד צבי הרשל אשכנזי. כל מכתב נשלח רק לאחר אישורו." as const;

/** Clarifies product scope: approval in-system; automated debtor delivery not live. */
export const lawFirmDeliveryScopeClarification =
  "במערכת הנוכחית: אישור נוסח ותיעוד במערכת. שליחה אוטומטית של מכתבים לחייבים דרך הפלטפורמה אינה פעילה בשלב זה." as const;

export function lawFirmMailtoHref(): string {
  return `mailto:${lawFirmIdentity.email}`;
}

export function lawFirmBranchTelHref(branch: LawFirmBranch): string {
  return `tel:${branch.phoneTel}`;
}
