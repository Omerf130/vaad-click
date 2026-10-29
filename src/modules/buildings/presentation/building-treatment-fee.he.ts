export function formatTreatmentFeeEligibleStatusHe(eligible: boolean): string {
  return eligible
    ? "מסומן — בסיס להוצאות טיפול במכתבי התראה"
    : "לא מסומן — ללא הוצאות טיפול במכתבי התראה";
}

export const BUILDING_TREATMENT_FEE_EXPLANATION_HE =
  "הגדרה זו משפיעה על בחירת נוסח בלוק הנחיות התשלום במכתב התראה ראשון (עם או בלי הוצאות טיפול), ובהתאם על חישוב הסכומים בתצוגה מקדימה ובטיוטות חדשות. מכתבים שכבר נסגרו או שמירת תמונת מצב (snapshot) שלהם לא משתנים בעקבות שינוי כאן. השינוי אינו מאשר, סוגר או שולח מכתב.";

export function formatTreatmentFeeEligibilitySavedMessageHe(changed: boolean, eligible: boolean): string {
  if (!changed) {
    return "לא בוצע שינוי — הסטטוס כבר תואם את הבחירה.";
  }
  return eligible
    ? "הבניין סומן כבעל בסיס להוצאות טיפול במכתבי התראה."
    : "הסימון להוצאות טיפול במכתבי התראה הוסר מהבניין.";
}
