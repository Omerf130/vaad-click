export type AdminNavItemStatus = "implemented" | "planned";

export type AdminNavItem = {
  id: string;
  labelHe: string;
  href: string | null;
  status: AdminNavItemStatus;
  unavailableReasonHe?: string;
};

export const ADMIN_NAV_ITEMS: readonly AdminNavItem[] = [
  { id: "overview", labelHe: "סקירה כללית", href: "/app/admin", status: "implemented" },
  {
    id: "buildings",
    labelHe: "בניינים",
    href: "/app/admin/buildings",
    status: "implemented",
  },
  {
    id: "management_companies",
    labelHe: "חברות ניהול",
    href: "/app/admin/management-companies",
    status: "implemented",
  },
  {
    id: "users",
    labelHe: "משתמשים",
    href: "/app/admin/users",
    status: "implemented",
  },
  {
    id: "debt_cases",
    labelHe: "תיקי חוב",
    href: null,
    status: "planned",
    unavailableReasonHe: "יושק ב-checkpoint עתידי",
  },
  {
    id: "lawyer_approvals",
    labelHe: "אישורי עורך דין",
    href: null,
    status: "planned",
    unavailableReasonHe: "יושק ב-checkpoint עתידי",
  },
  {
    id: "documents",
    labelHe: "מסמכים",
    href: null,
    status: "planned",
    unavailableReasonHe: "יושק ב-checkpoint עתידי",
  },
  {
    id: "payments",
    labelHe: "תשלומים",
    href: null,
    status: "planned",
    unavailableReasonHe: "יושק ב-checkpoint עתידי",
  },
  {
    id: "reports",
    labelHe: "דוחות",
    href: null,
    status: "planned",
    unavailableReasonHe: "יושק ב-checkpoint עתידי",
  },
  {
    id: "settings",
    labelHe: "הגדרות",
    href: "/app/admin/settings",
    status: "implemented",
  },
] as const;

export function isAdminNavItemActive(pathname: string, item: AdminNavItem): boolean {
  if (item.status !== "implemented" || !item.href) {
    return false;
  }
  if (item.href === "/app/admin") {
    return pathname === "/app/admin";
  }
  if (item.href === "/app/admin/settings") {
    return (
      pathname === "/app/admin/settings" ||
      pathname.startsWith("/app/admin/financial-settings")
    );
  }
  if (item.href === "/app/admin/users") {
    return pathname === "/app/admin/users" || pathname.startsWith("/app/admin/users/");
  }
  if (item.href === "/app/admin/buildings") {
    return pathname === "/app/admin/buildings" || pathname.startsWith("/app/admin/buildings/");
  }
  if (item.href === "/app/admin/management-companies") {
    return (
      pathname === "/app/admin/management-companies" ||
      pathname.startsWith("/app/admin/management-companies/")
    );
  }
  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}

export function getImplementedAdminNavItems(): AdminNavItem[] {
  return ADMIN_NAV_ITEMS.filter((item) => item.status === "implemented" && item.href);
}
