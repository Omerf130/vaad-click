import { ReportDateField } from "@/modules/reports/domain/report-date-field";

export function dateFieldLabelHe(dateField: ReportDateField): string {
  switch (dateField) {
    case ReportDateField.SUBMITTED:
      return "תאריך הגשה";
    case ReportDateField.UPDATED:
      return "עדכון אחרון";
    case ReportDateField.CREATED:
    default:
      return "תאריך יצירה";
  }
}
