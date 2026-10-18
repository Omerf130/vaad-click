import {
  BuildingOrganizationalStatus,
  LawyerVerificationStatus,
} from "@/modules/buildings/domain/building-status";

export function formatBuildingOrganizationalStatusHe(status: string): string {
  if (status === BuildingOrganizationalStatus.ACTIVE) {
    return "פעיל";
  }
  if (status === BuildingOrganizationalStatus.ARCHIVED) {
    return "בארכיון";
  }
  return status;
}

/** Operator-safe verification labels — never implies warning-letter dispatch. */
export function formatLawyerVerificationStatusHe(status: string): string {
  switch (status) {
    case LawyerVerificationStatus.NOT_STARTED:
      return "טרם התחיל";
    case LawyerVerificationStatus.PENDING_DOCUMENTS:
      return "ממתין למסמכים";
    case LawyerVerificationStatus.PENDING_LAWYER_REVIEW:
      return "ממתין לבדיקת עורך דין";
    case LawyerVerificationStatus.VERIFIED:
      return "אומת משפטית";
    default:
      return status;
  }
}

export function formatLawyerVerificationStatusHeForOperator(status: string): string {
  switch (status) {
    case LawyerVerificationStatus.NOT_STARTED:
      return "טרם אומת משפטית";
    case LawyerVerificationStatus.PENDING_DOCUMENTS:
      return "ממתין למסמכים";
    case LawyerVerificationStatus.PENDING_LAWYER_REVIEW:
      return "ממתין לבדיקת עורך דין";
    case LawyerVerificationStatus.VERIFIED:
      return "אומת משפטית (משרד)";
    default:
      return "סטטוס אימות לא ידוע";
  }
}
