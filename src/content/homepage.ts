/**
 * Provisional public homepage copy — requires lawyer review before publication.
 * See LAWYER_REVIEW_ITEMS at bottom of this file.
 */

export const homepageMeta = {
  title: "ועד בקליק | גביית חובות ועד בית — מסודר ושקוף",
  description:
    "פלטפורמה לנציגות בית משותף ולחברות ניהול: הגשת תיקי חיוב, מעקב התקדמות, ותיאום מכתבים משפטיים באישור עורך הדין.",
} as const;

export const homepageHeader = {
  brand: "ועד בקליק",
  navHowItWorks: "איך זה עובד",
  navWhoFor: "למי זה מתאים",
  loginLabel: "כניסה",
  loginHint: "כניסה למערכת — ייפתח בשלב הבא",
  registerLabel: "הרשמה",
  registerHint: "הרשמת בניין — תיפתח בשלב הבא",
} as const;

export const homepageHero = {
  eyebrow: "פלטפורמה לניהול גבייה בבניינים משותפים",
  headline: "גביית חובות ועד בית — מסודר, שקוף, ומלווה מקצועית",
  supporting:
    "נציגות הבית או חברת הניהול מעבירים פרטי דייר חייב; המערכת מארגנת את התיק, ומכתבי ההתראה נשלחים רק לאחר אישור עורך הדין — על נייר המכתבים של המשרד.",
  primaryCta: "הרשמת בניין",
  primaryCtaHint: "הרשמה — תיפתח בשלב הבא",
  secondaryCta: "למידע על התהליך",
  imageAlt: "בניין מגורים מודרני עם חצר מטופחת — צילום המחשה לסביבת מגורים ישראלית",
} as const;

export const homepageAudience = {
  title: "למי השירות מתאים",
  intro:
    "שני סוגי מפעילים יכולים לנהל את התהליך הטכני; הלקוח המשפטי בכל תיק הוא נציגות הבית המשותף.",
  committees: {
    title: "נציגות בית משותף",
    body: "נציג אחד לכל בניין. הרשמת הבניין פעם אחת, חתימה על ייפוי כוח והסכם שכר טרחה, ולאחר אישור — הגשת חייבים ומעקב אחר התקדמות הגבייה בלוח ייעודי.",
  },
  management: {
    title: "חברת ניהול",
    body: "ניהול מספר בניינים תחת חשבון אחד, בחירת בניין לפני כל הגשה, ודיווח על תשלומים שהתקבלו ישירות — בלי שהוועד יתעסק מול השכן.",
  },
} as const;

export const homepageProcess = {
  title: "איך זה עובד",
  intro:
    "שלושה שלבים ברורים. כל מכתב משפטי עובר אישור עורך הדין לפני שליחה — המערכת מכינה, עורך הדין מחליט.",
  steps: [
    {
      number: "1",
      title: "רישום הבניין והרשאות",
      body: "מילוי פרטי הבניין, העלאת מסמך מקשר, וחתימה דיגיטלית על ייפוי כוח והסכם שכר טרחה. אימות הבניין על ידי עורך הדין.",
    },
    {
      number: "2",
      title: "הגשת תיקי חיוב",
      body: "הזנת פרטי החייב והחוב; המערכת בודקת נתונים ומסמנת חריגות לבדיקה. לאחר מכן נוצר טיוטת מכתב לאישור.",
    },
    {
      number: "3",
      title: "מעקב והתקדמות",
      body: "צפייה במה נשלח, בסטטוס התיק ובצעד הבא — כולל דיווח על תשלום ישיר לוועד כאשר התקבל.",
    },
  ] as const,
} as const;

export const homepageTransparency = {
  title: "שקיפות וטיפול מקצועי",
  paragraphs: [
    "המערכת מרכזת מידע, מסמכים וסטטוסים — כדי שהנציגות תדע בכל רגע מה קורה בתיק.",
    "מכתבי ההתראה נוצרים מתבניות קבועות של המשרד, נבדקים, ונשלחים רק לאחר אישור מפורש של עורך הדין.",
    "התוכנה אינה מחליפה ייעוץ משפטי; ההחלטות המשפטיות והנוסחים הסופיים הם באחריות עורך הדין.",
  ],
} as const;

export const homepageFinalCta = {
  title: "מוכנים להתחיל עם הבניין שלכם?",
  body: "כשההרשמה תיפתח, תוכלו לרשום את הבניין פעם אחת ולהגיש תיקי חיוב בדרך מסודרת.",
  buttonLabel: "הרשמת בניין",
  buttonHint: "הרשמה — תיפתח בשלב הבא",
} as const;

export const homepageFooter = {
  brand: "ועד בקליק",
  description:
    "פלטפורמה לתיאום גביית חובות ועד בית בין נציגות, חברת ניהול ומשרד עורכי הדין.",
  copyright: "כל הזכויות שמורות.",
} as const;

/** Topics requiring lawyer sign-off before go-live */
export const LAWYER_REVIEW_ITEMS = [
  "All homepage marketing paragraphs and headlines",
  "CTA wording and any reference to legal outcomes or fees",
  "Hero and section titles — Bar advertising rules (Lishkat Horim)",
  "Approved building photography or illustration assets",
  "Privacy policy and terms links when those pages are published",
  "Firm name, contact details, and credentials when approved for public display",
] as const;
