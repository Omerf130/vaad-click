import { describe, expect, it } from "vitest";

import { AuditEventImmutableError } from "@/shared/audit/errors/audit-errors";

describe("audit append-only policy", () => {
  it("exposes an immutable error type for blocked mutations", () => {
    const error = new AuditEventImmutableError("deleteOne");
    expect(error.code).toBe("AUDIT_EVENT_IMMUTABLE");
    expect(error.message).toContain("deleteOne");
  });
});
