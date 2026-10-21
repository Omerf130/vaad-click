/** Display instant in Asia/Jerusalem for notification lists. */
export function formatNotificationDateTimeHe(iso: string): string {
  return new Date(iso).toLocaleString("he-IL", {
    timeZone: "Asia/Jerusalem",
    dateStyle: "medium",
    timeStyle: "short",
  });
}
