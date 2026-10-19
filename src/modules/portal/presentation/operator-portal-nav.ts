export const OPERATOR_PORTAL_ROUTES = {
  home: "/app",
  buildings: "/app/buildings",
  reports: "/app/reports",
  accountStatus: "/app/account-status",
} as const;

export type OperatorNavItem = {
  href: string;
  labelHe: string;
  /** Prefix match for active state (e.g. /app/buildings). */
  activePrefix?: string;
};

export function getOperatorNavItems(input: {
  primaryBuildingId?: string | null;
}): OperatorNavItem[] {
  const items: OperatorNavItem[] = [
    { href: OPERATOR_PORTAL_ROUTES.home, labelHe: "לוח בקרה", activePrefix: "/app" },
    {
      href: OPERATOR_PORTAL_ROUTES.buildings,
      labelHe: "בניינים",
      activePrefix: "/app/buildings",
    },
    {
      href: OPERATOR_PORTAL_ROUTES.reports,
      labelHe: "דוחות ונתונים",
      activePrefix: "/app/reports",
    },
  ];

  if (input.primaryBuildingId) {
    items.push({
      href: `/app/buildings/${input.primaryBuildingId}`,
      labelHe: "הבניין שלי",
      activePrefix: `/app/buildings/${input.primaryBuildingId}`,
    });
  }

  return items;
}
