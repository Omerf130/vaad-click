import { mapOrganizationErrorToHebrew } from "@/modules/buildings/presentation/organization-messages.he";
import {
  OrganizationErrorCode,
  type OrganizationErrorCode as OrganizationErrorCodeType,
} from "@/modules/buildings/domain/organization-errors";

export function mapOrganizationErrorToAdminUserHe(code: OrganizationErrorCodeType): string {
  if (code === OrganizationErrorCode.NOT_FOUND) {
    return "המשתמש לא נמצא.";
  }
  return mapOrganizationErrorToHebrew(code);
}
