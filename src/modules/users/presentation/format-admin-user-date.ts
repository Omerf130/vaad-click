export function formatAdminUserDateTime(value: Date): string {
  return new Intl.DateTimeFormat("he-IL", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(value);
}
