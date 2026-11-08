import type { LawyerSuppliedLegalBody } from "@/content/legal/legal-document-types";
import { LEGAL_OFFICIAL_DOCUMENT_DATE_DISPLAY } from "@/content/legal/legal-publication-config";

export const accessibilityStatementBody: LawyerSuppliedLegalBody = {
  documentHeading: "ועד בקליק – הצהרת נגישות",
  sections: [
    {
      number: "1",
      title: "מחויבות לנגישות",
      headingLevel: 2,
      blocks: [
        {
          type: "paragraph",
          text:
            'אתר ומערכת "ועד בקליק" (vaadclick.co.il), שמופעלים על ידי משרד עו"ד צבי הרשל אשכנזי, מיועדים לכל הציבור, כולל אנשים עם מוגבלות. אנחנו פועלים להנגשת האתר לפי חוק שוויון זכויות לאנשים עם מוגבלות, התשנ"ח–1998, ותקנות שוויון זכויות לאנשים עם מוגבלות (התאמות נגישות לשירות), התשע"ג–2013.',
        },
      ],
    },
    {
      number: "2",
      title: "רמת הנגישות ותאימות",
      headingLevel: 2,
      blocks: [
        {
          type: "paragraph",
          text:
            "יעד ההנגשה שלנו הוא התקן הישראלי ת\"י 5568, המבוסס על הנחיות WCAG 2.0, ברמה AA. עמידה מלאה בתקן טרם אומתה בבדיקה חיצונית מתועדת; פרטי הבדיקה (תאריך וגורם הבודק) יפורסמו עם השלמת האימות.",
        },
        {
          type: "paragraph",
          text:
            "המערכת מיועדת לשימוש בדפדפנים Chrome, Edge, Firefox ו-Safari, במחשב ובמכשירים ניידים (iOS ו-Android). תאימות מלאה בכל שילובי הדפדפן והמכשירים טרם הושלמה כחלק מבדיקת נגישות מתועדת.",
        },
      ],
    },
    {
      number: "3",
      title: "התאמות שבוצעו",
      headingLevel: 2,
      blocks: [
        {
          type: "list",
          items: [
            'מבנה כותרות קבוע וברור, וקישור "דלג לתוכן הראשי" בראש כל עמוד.',
            "ניווט מלא במקלדת, עם סימון מוקד נראה.",
            "תמיכה בקוראי מסך: תוויות לשדות טופס, תיאור חלופי לתמונות, והודעות שגיאה שנקראות.",
            "ניגודיות צבעים מספקים, ומידע שלא מועבר בצבע בלבד.",
            "הגדלת טקסט עד 200% בלי פגיעה בתוכן, ותצוגה מותאמת לנייד.",
            "שפת האתר וכיוון הכתיבה (עברית, מימין לשמאל) מוגדרים בקוד.",
          ],
        },
      ],
    },
    {
      number: "4",
      title: "מגבלות ידועות",
      headingLevel: 2,
      blocks: [
        {
          type: "list",
          items: [
            "מסמכי PDF שלקוחות מעלים (כרטסת, פרוטוקול, נסח טאבו) אינם בשליטתנו, וייתכן שאינם נגישים.",
            "דף התשלום בכרטיס אשראי מופעל על ידי חברת הסליקה, ונגישותו באחריותה.",
            "אם מסמך או עמוד אינם נגישים לך, פנה אלינו ונספק את המידע בדרך חלופית, כמו טלפון או מייל בטקסט פשוט.",
          ],
        },
      ],
    },
    {
      number: "5",
      title: "רכז נגישות ופניות",
      headingLevel: 2,
      blocks: [
        {
          type: "paragraph",
          text:
            "נתקלת בבעיית נגישות, או שיש לך הצעה לשיפור? נשמח לשמוע. כדי שנוכל לטפל בפנייה, כדאי לציין את העמוד שבו נתקלת, מה ניסית לעשות, ובאיזה דפדפן וטכנולוגיה מסייעת השתמשת.",
        },
        {
          type: "paragraph",
          text:
            'טלפון: 054-9001774 · דוא"ל: azvika@gmail.com · כתובת: שד\' ההסתדרות 285, חיפה',
        },
        {
          type: "paragraph",
          text:
            "שם רכז/ת הנגישות ומועד המענה לפניות נגישות יפורסמו עם מינוי וקביעת הנהלה, בהתאם למדיניות המשרד.",
        },
        {
          type: "paragraph",
          text: `הצהרה זו עודכנה לאחרונה ביום: ${LEGAL_OFFICIAL_DOCUMENT_DATE_DISPLAY}`,
        },
      ],
    },
  ],
};

export function accessibilityStatementHasAuthoritativeBody(): boolean {
  return accessibilityStatementBody.sections.length > 0;
}

export const ACCESSIBILITY_STATEMENT_SECTION_TITLES = [
  "מחויבות לנגישות",
  "רמת הנגישות ותאימות",
  "התאמות שבוצעו",
  "מגבלות ידועות",
  "רכז נגישות ופניות",
] as const;
