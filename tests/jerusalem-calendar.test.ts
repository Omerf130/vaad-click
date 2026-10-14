import { describe, expect, it } from "vitest";

import {
  isEffectiveFromNotBeforeTodayJerusalem,
  startOfDayJerusalem,
  todayJerusalemIso,
} from "@/shared/time/jerusalem-calendar";

describe("Jerusalem calendar helpers", () => {
  it("formats today as YYYY-MM-DD", () => {
    expect(todayJerusalemIso(new Date("2026-06-15T12:00:00Z"))).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("resolves start of day in Asia/Jerusalem", () => {
    const start = startOfDayJerusalem("2026-06-15");
    expect(start).toBeInstanceOf(Date);
    expect(start.getTime()).toBeLessThan(Date.parse("2026-06-15T22:00:00Z"));
  });

  it("treats same-day effectiveFrom as not retroactive", () => {
    const todayIso = todayJerusalemIso(new Date("2026-10-14T10:00:00Z"));
    const effectiveFrom = startOfDayJerusalem(todayIso);
    expect(
      isEffectiveFromNotBeforeTodayJerusalem(
        effectiveFrom,
        new Date("2026-10-14T15:00:00Z"),
      ),
    ).toBe(true);
  });

  it("rejects effectiveFrom before today in Jerusalem", () => {
    const effectiveFrom = startOfDayJerusalem("2020-01-01");
    expect(
      isEffectiveFromNotBeforeTodayJerusalem(
        effectiveFrom,
        new Date("2026-10-14T15:00:00Z"),
      ),
    ).toBe(false);
  });
});
