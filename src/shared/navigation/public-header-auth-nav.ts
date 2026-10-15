import { homepageHeader } from "@/content/homepage";
import { AccountStatus } from "@/modules/users/domain/account-status";
import { UserRole } from "@/modules/users/domain/user-role";
import {
  canAccessAccountStatusPage,
  canAccessOperationalPortal,
} from "@/shared/auth/account-portal-access";
import type { AuthenticatedContext } from "@/shared/auth/get-authenticated-context";

export type PublicHeaderNavAction = {
  href: string;
  label: string;
  variant: "primary" | "ghost";
};

export const PUBLIC_HEADER_NAV_DESTINATIONS = {
  login: "/login",
  register: "/register",
  operatorDashboard: "/app",
  lawyerAdmin: "/app/admin",
  accountStatus: "/app/account-status",
} as const;

export function resolvePublicHeaderNavActions(
  context: AuthenticatedContext | null,
): PublicHeaderNavAction[] {
  if (!context) {
    return [
      {
        href: PUBLIC_HEADER_NAV_DESTINATIONS.login,
        label: homepageHeader.loginLabel,
        variant: "ghost",
      },
      {
        href: PUBLIC_HEADER_NAV_DESTINATIONS.register,
        label: homepageHeader.registerLabel,
        variant: "primary",
      },
    ];
  }

  if (!canAccessOperationalPortal(context)) {
    if (canAccessAccountStatusPage(context)) {
      const label =
        context.user.accountStatus === AccountStatus.REJECTED
          ? "סטטוס חשבון"
          : "מעקב אחר הרשמה";
      return [
        {
          href: PUBLIC_HEADER_NAV_DESTINATIONS.accountStatus,
          label,
          variant: "primary",
        },
      ];
    }
    return [
      {
        href: PUBLIC_HEADER_NAV_DESTINATIONS.login,
        label: homepageHeader.loginLabel,
        variant: "primary",
      },
    ];
  }

  if (context.user.role === UserRole.LAWYER_ADMIN) {
    return [
      {
        href: PUBLIC_HEADER_NAV_DESTINATIONS.lawyerAdmin,
        label: "ניהול משרד",
        variant: "primary",
      },
    ];
  }

  return [
    {
      href: PUBLIC_HEADER_NAV_DESTINATIONS.operatorDashboard,
      label: "מעבר לדשבורד",
      variant: "primary",
    },
  ];
}
