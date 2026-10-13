import { describe, expect, it } from "vitest";

import { UserRole } from "@/modules/users/domain/user-role";
import { AuditActorType } from "@/shared/audit/domain/audit-actor-type";
import { AuditEventType } from "@/shared/audit/domain/audit-event-taxonomy";
import { AuditOutcome } from "@/shared/audit/domain/audit-outcome";
import { auditEventWriteInputSchema } from "@/shared/audit/validation/audit-event-input.schema";

describe("auditEventWriteInputSchema", () => {
  it("accepts events without a target entity", () => {
    const parsed = auditEventWriteInputSchema.parse({
      eventType: AuditEventType.AUTH_LOGIN_FAILURE,
      actor: {
        type: AuditActorType.SYSTEM,
        systemComponent: "auth.login",
      },
      action: "login",
      outcome: AuditOutcome.FAILURE,
    });
    expect(parsed.target).toBeUndefined();
  });

  it("requires user actor fields", () => {
    expect(() =>
      auditEventWriteInputSchema.parse({
        eventType: AuditEventType.AUTH_LOGIN_SUCCESS,
        actor: { type: AuditActorType.USER, userId: "u1", role: UserRole.LAWYER_ADMIN },
        action: "login",
        outcome: AuditOutcome.SUCCESS,
      }),
    ).not.toThrow();
  });

  it("defaults eventVersion to 1", () => {
    const parsed = auditEventWriteInputSchema.parse({
      eventType: AuditEventType.AUTH_LOGOUT,
      actor: buildSystem(),
      action: "logout",
      outcome: AuditOutcome.SUCCESS,
    });
    expect(parsed.eventVersion).toBe(1);
  });

  it("rejects client-supplied trusted fields", () => {
    expect(() =>
      auditEventWriteInputSchema.parse({
        eventType: AuditEventType.AUTH_LOGIN_FAILURE,
        actor: buildSystem(),
        action: "login",
        outcome: AuditOutcome.FAILURE,
        occurredAt: new Date().toISOString(),
      }),
    ).toThrow();
  });

  it("rejects malformed event types", () => {
    expect(() =>
      auditEventWriteInputSchema.parse({
        eventType: "Invalid Type!",
        actor: buildSystem(),
        action: "x",
        outcome: AuditOutcome.FAILURE,
      }),
    ).toThrow();
  });
});

function buildSystem() {
  return { type: AuditActorType.SYSTEM, systemComponent: "test" };
}
