export function resolveAdminTopBarTitle(pathname: string): string {
  if (pathname.startsWith("/app/admin/financial-settings")) {
    return "הגדרות כספיות";
  }
  if (pathname.startsWith("/app/admin/settings")) {
    return "הגדרות";
  }
  if (pathname === "/app/admin") {
    return "סקירה כללית";
  }
  return "ניהול משרד";
}
