/**
 * Public homepage copy — legal/marketing text subject to lawyer review where noted.
 */

import { lawFirmIdentity, lawFirmLegalServiceNotice } from "@/content/law-firm";

export const homepageMeta = {
  title: "ועד בקליק | שירות משפטי לגביית חובות ועד בית",
  description: `${lawFirmIdentity.serviceContext} — תהליך מסודר, פיקוח עו״ד, ומעקב שקוף לנציגות ולחברות ניהול.`,
} as const;

export const homepageHeader = {
  brand: lawFirmIdentity.productName,
  navHowItWorks: "איך זה עובד",
  navWhoFor: "למי זה מתאים",
  navContact: "יצירת קשר",
  loginLabel: "כניסה",
  loginHint: "כניסה למערכת — ייפתח בשלב הבא",
  registerLabel: "הרשמה",
  registerHint: "הרשמת בניין — תיפתח בשלב הבא",
} as const;

export const homepageHero = {
  eyebrow: `${lawFirmIdentity.lawyerDisplayName} · ${lawFirmIdentity.serviceContext}`,
  headline: "טיפול משפטי מסודר בחובות ועד בית — עם פיקוח עורך הדין ושקיפות לנציגות",
  supporting: `${lawFirmLegalServiceNotice} המערכת מארגנת תיקים, מסמכים וסטטוסים — לעבודה מסודרת של נציגות הבית וחברות הניהול.`,
  primaryCta: "הרשמת בניין",
  primaryCtaHint: "הרשמה — תיפתח בשלב הבא",
  secondaryCta: "למידע על התהליך",
  imageAlt: "בניין מגורים מודרני עם חצר מטופחת — צילום המחשה לסביבת מגורים ישראלית",
} as const;

export const homepageAudience = {
  title: "למי השירות מתאים",
  intro:
    "שירות משפטי-תפעולי לגבייה בבניינים משותפים: נציגות או חברת ניהול מנהלים את ההגשה והמעקב; הלקוח המשפטי בכל תיק הוא נציגות הבית.",
  committees: {
    title: "נציגות בית משותף",
    body: "נציג אחד לכל בניין. רישום הבניין, ייפוי כוח והסכם שכר טרחה לפי התהליך המוסכם, ולאחר אישור — הגשת חייבים ומעקב אחר התקדמות בלוח ייעודי.",
  },
  management: {
    title: "חברת ניהול",
    body: "ניהול מספר בניינים תחת חשבון אחד, בחירת בניין לפני כל הגשה, ודיווח על תשלומים שהתקבלו ישירות — בלי שהוועד יתעסק מול השכן.",
  },
} as const;

export type HomepageProcessStep = {
  number: string;
  title: string;
  body: string;
  futureCapability?: boolean;
};

export const homepageProcess = {
  title: "איך זה עובד",
  intro:
    "ארבעה שלבים — מהרישום ועד תמונה עתידית של דיווח תשלומים. כל נוסח מכתב עובר אישור עורך הדין לפני יציאה לפועל.",
  steps: [
    {
      number: "1",
      title: "רישום הבניין והרשאות",
      body: "מילוי פרטי הבניין, העלאת מסמך מקשר, וחתימה על ייפוי כוח והסכם שכר טרחה לפי התהליך המוסכם. אימות הבניין על ידי עורך הדין.",
    },
    {
      number: "2",
      title: "הגשת תיקי חיוב",
      body: "הזנת פרטי החייב והחוב; המערכת בודקת נתונים ומסמנת חריגות לבדיקה. לאחר מכן נוצרת טיוטת מכתב לאישור עורך הדין.",
    },
    {
      number: "3",
      title: "מעקב והתקדמות",
      body: "צפייה במה אושר, בסטטוס התיק ובצעד הבא — כולל דיווח על תשלום ישיר לוועד כאשר התקבל.",
    },
    {
      number: "4",
      title: "התשלום מגיע אליכם",
      body: "בשלב עתידי: דיווח מרוכז על גבייה, קישורי תשלום ומסלולי הפקדה לנציגות — כדי לראות בבירור מה הגיע אליכם. יכולות אלו אינן פעילות במערכת כיום.",
      futureCapability: true,
    },
  ] satisfies HomepageProcessStep[],
} as const;

export const homepageTransparency = {
  title: "פיקוח משפטי ושקיפות תפעולית",
  paragraphs: [
    "המערכת מרכזת מידע, מסמכים וסטטוסים — כדי שהנציגות תדע בכל רגע מה קורה בתיק.",
    lawFirmLegalServiceNotice,
    "התוכנה אינה מחליפה ייעוץ משפטי; ההחלטות המשפטיות והנוסחים הסופיים הם באחריות עורך הדין.",
  ],
} as const;

export const homepageContact = {
  title: "יצירת קשר עם המשרד",
  intro: `לשאלות על השירות, הצטרפות בניין או תיאום עם ${lawFirmIdentity.lawyerDisplayName} — פנו אלינו:`,
} as const;

export const homepageFinalCta = {
  title: "מוכנים להתחיל עם הבניין שלכם?",
  body: "כשההרשמה תיפתח, תוכלו לרשום את הבניין פעם אחת ולהגיש תיקי חיוב בדרך מסודרת — תחת פיקוח המשרד.",
  buttonLabel: "הרשמת בניין",
  buttonHint: "הרשמה — תיפתח בשלב הבא",
} as const;

export const homepageFooter = {
  brand: lawFirmIdentity.productName,
  operatorLine: lawFirmIdentity.lawyerDisplayName,
  description: lawFirmIdentity.serviceContext,
  copyright: "כל הזכויות שמורות.",
} as const;

/** Topics requiring lawyer sign-off before go-live */
export const LAWYER_REVIEW_ITEMS = [
  "Hero and section marketing copy — bar advertising rules",
  "Law firm legal service notice wording (final approval)",
  "CTA wording and references to fees or outcomes",
  "Approved photography or illustration assets",
  "Privacy policy, terms, and accessibility statement — full approved text",
] as const;
