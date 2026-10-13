import { describe, expect, it } from "vitest";

import {
  AuditEventType,
  isWellFormedAuditEventType,
} from "@/shared/audit/domain/audit-event-taxonomy";

describe("audit event taxonomy", () => {
  it("defines initial categories without duplicates", () => {
    const values = Object.values(AuditEventType);
    expect(new Set(values).size).toBe(values.length);
  });

  it("validates well-formed event type strings", () => {
    expect(isWellFormedAuditEventType(AuditEventType.PAYMENT_RECORDED)).toBe(true);
    expect(isWellFormedAuditEventType("bad type")).toBe(false);
  });
});
