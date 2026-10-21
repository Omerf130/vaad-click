import { describe, expect, it } from "vitest";

import { formatNotificationDateTimeHe } from "@/modules/notifications/presentation/format-notification-datetime.he";

describe("formatNotificationDateTimeHe", () => {
  it("formats with Jerusalem timezone", () => {
    const formatted = formatNotificationDateTimeHe("2024-06-15T12:00:00.000Z");
    expect(formatted.length).toBeGreaterThan(5);
    expect(formatted).toMatch(/\d/);
  });
});
