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
    href: null,
    status: "planned",
    unavailableReasonHe: "יושק ב-checkpoint עתידי",
  },
  {
    id: "users",
    labelHe: "משתמשים",
    href: null,
    status: "planned",
    unavailableReasonHe: "יושק ב-checkpoint עתידי",
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
  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}

export function getImplementedAdminNavItems(): AdminNavItem[] {
  return ADMIN_NAV_ITEMS.filter((item) => item.status === "implemented" && item.href);
}
