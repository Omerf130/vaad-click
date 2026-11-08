/**
 * Factual in-product adaptations verified in CP18C code review.
 * Not a legal accessibility compliance claim and not a substitute for counsel's statement.
 */
export const verifiedSiteAccessibilityAdaptations = [
  "מאפייני שפה: `lang=\"he\"` ו-`dir=\"rtl\"` ברמת המסמך הראשי.",
  "קישור דילוג לתוכן הראשי בדף הבית ובדפים המשפטיים הציבוריים.",
  "מצבי מיקוד נראים (`:focus-visible`) לקישורים ולכפתורים בדפוס הגלובלי.",
  "שדות הרשמה וכניסה עם תוויות (`label`) וקישור לשגיאות בשדה.",
  "טקסט שגיאות טופס עם `role=\"alert\"` בהרשמה.",
  "היררכיית כותרות בדפים המשפטיים: `h1` למסמך, `h2`/`h3` לסעיפים.",
] as const;
