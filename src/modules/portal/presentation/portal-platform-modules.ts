import { UserRole } from "@/modules/users/domain/user-role";

export type PortalPlatformModuleStatus = "available" | "coming_soon";

export type PortalPlatformModule = {
  id: string;
  titleHe: string;
  descriptionHe: string;
  status: PortalPlatformModuleStatus;
  href?: string;
};

export function getPortalPlatformModules(input: {
  role: UserRole;
  primaryBuildingId?: string;
}): PortalPlatformModule[] {
  const debtCasesHref = input.primaryBuildingId
    ? `/app/buildings/${input.primaryBuildingId}`
    : "/app/buildings";

  return [
    {
      id: "buildings",
      titleHe: "ניהול בניינים",
      descriptionHe: "פרטי בניין, הרשאות ותצוגה תפעולית.",
      status: "available",
      href: "/app/buildings",
    },
    {
      id: "debt_cases",
      titleHe: "תיקי חוב",
      descriptionHe: "פתיחת תיקים, טיוטות והגשה לבדיקת עורך דין.",
      status: "available",
      href: debtCasesHref,
    },
    {
      id: "documents",
      titleHe: "מסמכים",
      descriptionHe: "אחסון והצגת מסמכים — בפיתוח.",
      status: "coming_soon",
    },
    {
      id: "legal_engagement",
      titleHe: "הסכם והיערכות משפטית",
      descriptionHe: "מעקב מוכנות משפטית — זמין כיום בממשק מנהל המשרד.",
      status: "coming_soon",
    },
    {
      id: "payments",
      titleHe: "תשלומים",
      descriptionHe: "גבייה ותשלומים — עדיין לא זמין.",
      status: "coming_soon",
    },
    {
      id: "reports",
      titleHe: "דוחות",
      descriptionHe: "דוחות תפעוליים — בקרוב.",
      status: "coming_soon",
    },
  ];
}
