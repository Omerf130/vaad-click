import { mapOrganizationErrorToHebrew } from "@/modules/buildings/presentation/organization-messages.he";
import {
  OrganizationErrorCode,
  type OrganizationErrorCode as OrganizationErrorCodeType,
} from "@/modules/buildings/domain/organization-errors";

export function mapOrganizationErrorToAdminUserHe(code: OrganizationErrorCodeType): string {
  if (code === OrganizationErrorCode.NOT_FOUND) {
    return "המשתמש לא נמצא.";
  }
  if (code === OrganizationErrorCode.VALIDATION) {
    return "לא ניתן להשלים את השיוך — בדקו שהנתונים תקינים ושקיימת רשומת חברת ניהול למשתמש (אם רלוונטי).";
  }
  return mapOrganizationErrorToHebrew(code);
}
