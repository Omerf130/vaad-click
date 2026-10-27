import {
  INITIAL_WARNING_PAYMENT_BLOCK_WITHOUT_TREATMENT,
  INITIAL_WARNING_PAYMENT_BLOCK_WITH_TREATMENT,
} from "@/modules/warning-letters/templates/payment-instruction-clauses";

/**
 * Stable clause ids for initial warning (Hebrew prose from warning-letter-sample.docx).
 * Placeholders: {name} — substituted at snapshot/render time.
 */

export type InitialWarningClauseId =
  | "occupancy_owner_single"
  | "occupancy_owner_joint"
  | "occupancy_tenant"
  | "mc_maintenance_role"
  | "non_payment_despite_contact"
  | "debt_table_intro"
  | "legal_basis_section_58"
  | "grace_period_receipt_wording"
  | "treatment_expenses"
  | "lawsuit_threat"
  | "good_faith_opportunity"
  | "prior_contacts_documented"
  | "printed_deadline_lawsuit"
  | "no_second_warning"
  | "payment_block"
  | "evidence_disclaimer";

export type InitialWarningClauseDefinition = {
  id: InitialWarningClauseId;
  /** Fixed legal text; may include {placeholders}. */
  template: string;
};

/** Clauses shared by all variants (exact sample wording). */
export const INITIAL_WARNING_FIXED_CLAUSES: Record<
  Exclude<
    InitialWarningClauseId,
    "occupancy_owner_single" | "occupancy_owner_joint" | "occupancy_tenant" | "mc_maintenance_role" | "treatment_expenses"
  >,
  InitialWarningClauseDefinition
> = {
  non_payment_despite_contact: {
    id: "non_payment_despite_contact",
    template:
      "חוב דמי הניהול והאחזקה בגין היחידה אינו משולם כסדרו, חרף פניות קודמות שנעשו אלייך.",
  },
  debt_table_intro: {
    id: "debt_table_intro",
    template: 'להלן פירוט סכומי החוב, קרן בלבד, לפי שנים וחודשים, כולל מע"מ:',
  },
  legal_basis_section_58: {
    id: "legal_basis_section_58",
    template:
      'חובת תשלום דמי הניהול והאחזקה מוטלת על בעלי הדירות והמחזיקים בפועל בבית המשותף, בהתאם להוראות סעיף 58(א) לחוק המקרקעין, התשכ"ט–1969.',
  },
  grace_period_receipt_wording: {
    id: "grace_period_receipt_wording",
    template:
      "לפיכך, ניתנת לכם בזאת התראה לפירעון מלוא החוב האמור, בתוך ארכת חסד של 10 ימים ממועד קבלת מכתב זה.",
  },
  lawsuit_threat: {
    id: "lawsuit_threat",
    template:
      "מובהר בזאת כי ככל שהחוב לא ייפרע במלואו ובמועד, תישקל נקיטת הליכים משפטיים מתבקשים בשם הנציגות ומרשתי, לרבות הגשת תביעה בפני המפקח/ת על רישום מקרקעין, והכול על אחריותך הבלעדית ותוך חיובך בהוצאות כפי שייפסקו.",
  },
  good_faith_opportunity: {
    id: "good_faith_opportunity",
    template:
      "מכתב זה יהווה ראיה לכך שניתנה לך הזדמנות נאותה להסדרת החוב בדרכי שלום, בטרם נקיטת הליכים משפטיים.",
  },
  prior_contacts_documented: {
    id: "prior_contacts_documented",
    template:
      "מכתב זה נשלח לאחר שפניות קודמות לא הועילו, לרבות פניות בכתב, כאשר תיעוד מלא של הפניות והתאריכים מצוי בידי מרשתי.",
  },
  printed_deadline_lawsuit: {
    id: "printed_deadline_lawsuit",
    template:
      "במידה והחוב (כולל הוצאות הטיפול המשפטי כאמור לעיל) לא יוסדר במלואו בתוך 10 ימים, עד לתאריך {printedDeadlineDateDisplay}, תוגש תביעה מטעם מרשתי כמיופת כוח מטעם הנציגות בפני המפקח/ת על רישום מקרקעין באזורכם, והיא תומצא לך כדין.",
  },
  no_second_warning: {
    id: "no_second_warning",
    template: "לא תישלח התראה נוספת.",
  },
  payment_block: {
    id: "payment_block",
    template: INITIAL_WARNING_PAYMENT_BLOCK_WITH_TREATMENT,
  },
  evidence_disclaimer: {
    id: "evidence_disclaimer",
    template:
      "***** יודגש כי כל הטענות דלעיל מגובות בתיעוד מלא ומפורט המצוי בידי מרשתי. בשלב זה, ולפנים משורת הדין, נמנעת מרשתי מצירוף הראיות, אולם מובהר כי אלו יוצגו במלואן במסגרת ההליך המשפטי, ככל שזה יידרש.",
  },
};

/** @deprecated use INITIAL_WARNING_PAYMENT_BLOCK_WITHOUT_TREATMENT from payment-instruction-clauses */
export const INITIAL_WARNING_PAYMENT_BLOCK_NO_TREATMENT =
  INITIAL_WARNING_PAYMENT_BLOCK_WITHOUT_TREATMENT;

export const INITIAL_WARNING_OCCUPANCY_CLAUSES = {
  owner_single: {
    id: "occupancy_owner_single" as const,
    template:
      'בבעלותך המשותפת רשומה הדירה שבנדון (להלן: "היחידה"), המשמשת אותך למגורים.',
  },
  owner_joint: {
    id: "occupancy_owner_joint" as const,
    template:
      'בבעלותכם המשותפת רשומה הדירה שבנדון (להלן: "היחידה"), המשמשת אתכם למגורים.',
  },
  tenant: {
    id: "occupancy_tenant" as const,
    template:
      'הנך שוכר/ת של הדירה שבנדון (להלן: "היחידה") (מחזיק/ה בפועל).',
  },
};

export const INITIAL_WARNING_MC_MAINTENANCE_CLAUSE = {
  id: "mc_maintenance_role" as const,
  template:
    "חברת הניהול (מרשתי) מנהלת את האחזקה והתחזוקה השוטפת של הבית המשותף.",
};

export const INITIAL_WARNING_TREATMENT_CLAUSE = {
  id: "treatment_expenses" as const,
  template:
    'מכתב זה מחייב בתשלום הוצאות טיפול עו"ד על סך כולל של {treatmentFeeGrossDisplay} (כולל מע"מ), אשר מתווסף לחוב הקרן. לפיכך, החוב הכולל (בתוספות הוצאות טיפול) הוא: {totalWithTreatmentDisplay} .',
};

export const INITIAL_WARNING_INTRO_TEMPLATES = {
  management_company: {
    template:
      'הריני לפנות אלייך בשם חברת הניהול {managementCompanyLegalName} (להלן: "מרשתי") ונציגות הבית המשותף ברח\' {street} מס\' {houseNumber}, בעיר {city} (להלן: "מיופת הכוח"), ובהיותי בא-כוחה המשפטי, ולהתריע כדלקמן:',
  },
  committee: {
    template:
      'הריני לפנות אלייך בשם ונציגות הבית המשותף ברח\' {street} מס\' {houseNumber}, בעיר {city} (להלן: "מרשתי"), ובהיותי בא-כוחה המשפטי, ולהתריע כדלקמן:',
  },
};

export const INITIAL_WARNING_SUBJECT_TEMPLATE =
  "הנידון: {buildingStreetLine} - מכתב התראה בטרם נקיטת הליכים משפטיים";
