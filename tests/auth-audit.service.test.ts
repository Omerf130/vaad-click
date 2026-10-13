import { beforeEach, describe, expect, it, vi } from "vitest";

import { SessionAuthStage } from "@/modules/auth/domain/session-types";
import { UserRole } from "@/modules/users/domain/user-role";
import { AuditEventType } from "@/shared/audit/domain/audit-event-taxonomy";
import { AuditOutcome } from "@/shared/audit/domain/audit-outcome";

const mockWrite = vi.fn();
const mockWriteMandatory = vi.fn();

vi.mock("@/modules/audit/services/audit-writer.service", () => ({
  writeAuditEvent: (...args: unknown[]) => mockWrite(...args),
  writeAuditEventMandatory: (...args: unknown[]) => mockWriteMandatory(...args),
}));

describe("auth audit recording", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockWrite.mockResolvedValue({ eventId: "evt-1" });
    mockWriteMandatory.mockResolvedValue({ eventId: "evt-2" });
  });

  it("records login failure without email metadata", async () => {
    const { recordAuthLoginFailure } = await import(
      "@/modules/audit/services/auth-audit.service"
    );
    await recordAuthLoginFailure({ correlationId: "corr-1" });

    expect(mockWrite).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: AuditEventType.AUTH_LOGIN_FAILURE,
        outcome: AuditOutcome.FAILURE,
        metadata: { reasonCode: "authentication_failed" },
        correlationId: "corr-1",
      }),
    );
    const payload = mockWrite.mock.calls[0]?.[0];
    expect(JSON.stringify(payload)).not.toMatch(/@/);
  });

  it("records login success as mandatory transactional write", async () => {
    const { recordAuthLoginSuccess } = await import(
      "@/modules/audit/services/auth-audit.service"
    );
    const session = { id: "mongo-session" };

    await recordAuthLoginSuccess({
      userId: "user-1",
      role: UserRole.LAWYER_ADMIN,
      authStage: SessionAuthStage.PRIMARY,
      session: session as never,
    });

    expect(mockWriteMandatory).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: AuditEventType.AUTH_LOGIN_SUCCESS,
        target: { entityType: "user", entityId: "user-1" },
      }),
      { session },
    );
  });

  it("rejects sensitive metadata keys at schema boundary", async () => {
    const { auditMetadataSchema } = await import(
      "@/shared/audit/validation/audit-metadata.schema"
    );
    expect(() =>
      auditMetadataSchema.parse({ sessionToken: "abc" }),
    ).toThrow();
  });
});
