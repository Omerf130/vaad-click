export const WARNING_LETTER_PREVIEW_DEADLINE_PROVISIONAL_HE =
  "מועד אחרון מודפס (תאריך מכתב + 10 ימים) מוצג לתצוגה מקדימה בלבד; קיים גם ניסוח '10 ימים מקבלת המכתב'. סגירה והגשה מבצעיות חסומות עד להכרעה משפטית.";

export function formatIncompletePreviewWarningHe(input: {
  treatmentFeeEligible: boolean;
}): string {
  if (input.treatmentFeeEligible) {
    return "תצוגה מקדימה לא שלמה: לבניין מסומן בסיס להוצאות טיפול, אך לא נמצאו הגדרות כספיות מפורסמות (או חסר סכום הוצאות טיפול לחייב) לתאריך המכתב. סכומי הוצאות הטיפול והסה״כ מוצגים כ״לא זמין״. לא ניתן לאשר או לשלוח מכתב על בסיס תצוגה זו.";
  }
  return "תצוגה מקדימה לא שלמה.";
}

export function combineWarningLetterPreviewWarningsHe(parts: Array<string | null | undefined>): string | null {
  const messages = parts.map((part) => part?.trim()).filter(Boolean) as string[];
  return messages.length > 0 ? messages.join(" ") : null;
}
