import { AccountStatus } from "@/modules/users/domain/account-status";
import { UserRole } from "@/modules/users/domain/user-role";
import type { StatusBadgeVariant } from "@/components/ui/StatusBadge/StatusBadge";

export function formatAdminUserRoleHe(role: UserRole): string {
  if (role === UserRole.BUILDING_REP) {
    return "נציג בניין";
  }
  if (role === UserRole.MANAGEMENT_COMPANY) {
    return "חברת ניהול";
  }
  return "מנהל משרד";
}

export function formatAccountStatusHe(status: AccountStatus): string {
  switch (status) {
    case AccountStatus.PENDING_APPROVAL:
      return "ממתין לאישור";
    case AccountStatus.ACTIVE:
      return "פעיל";
    case AccountStatus.REJECTED:
      return "נדחה";
    case AccountStatus.DISABLED:
      return "מושבת";
    case AccountStatus.LOCKED:
      return "נעול";
    default:
      return status;
  }
}

export function accountStatusBadgeVariant(status: AccountStatus): StatusBadgeVariant {
  switch (status) {
    case AccountStatus.PENDING_APPROVAL:
      return "warning";
    case AccountStatus.ACTIVE:
      return "success";
    case AccountStatus.REJECTED:
      return "error";
    case AccountStatus.DISABLED:
    case AccountStatus.LOCKED:
      return "neutral";
    default:
      return "neutral";
  }
}

export const ADMIN_USER_UI_COPY = {
  approvalNote:
    "אישור החשבון מאפשר התחברות בלבד. שיוך לבניין או לחברת ניהול יבוצע בנפרד (CP6C.2).",
  approveConfirmTitle: "לאשר את החשבון?",
  approveConfirmBody:
    "המשתמש יוכל להתחבר לאחר האישור, אך לא יקבל גישה לבניין עד שיוך מפורש.",
  rejectConfirmTitle: "לדחות את הבקשה?",
  rejectConfirmBody:
    "המשתמש יוכל להתחבר רק לצפייה בסטטוס החשבון. ניתן לשקול מחדש מאוחר יותר.",
  reconsiderConfirmTitle: "לשקול מחדש ולאשר?",
  reconsiderConfirmBody:
    "החשבון יהפוך לפעיל. שיוך לבניין עדיין דורש פעולה נפרדת.",
  confirmAction: "אישור",
  cancelAction: "ביטול",
  rejectAction: "דחייה",
  approveAction: "אישור חשבון",
  reconsiderAction: "שקילה מחדש ואישור",
} as const;
