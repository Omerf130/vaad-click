export function resolveAdminTopBarTitle(pathname: string): string {
  if (pathname.startsWith("/app/admin/financial-settings")) {
    return "הגדרות כספיות";
  }
  if (pathname.startsWith("/app/admin/buildings")) {
    return "בניינים";
  }
  if (pathname.startsWith("/app/admin/management-companies")) {
    return "חברות ניהול";
  }
  if (pathname.startsWith("/app/admin/users")) {
    return "משתמשים";
  }
  if (pathname.startsWith("/app/admin/settings")) {
    return "הגדרות";
  }
  if (pathname.startsWith("/app/admin/debt-cases")) {
    return "תיקי חוב";
  }
  if (pathname.startsWith("/app/admin/warning-letter-templates")) {
    return "תבניות מכתב";
  }
  if (pathname === "/app/admin") {
    return "סקירה כללית";
  }
  return "ניהול משרד";
}
