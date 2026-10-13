import { beforeEach, describe, expect, it, vi } from "vitest";

import { AuditActorType } from "@/shared/audit/domain/audit-actor-type";
import { AuditEventType } from "@/shared/audit/domain/audit-event-taxonomy";
import { AuditOutcome } from "@/shared/audit/domain/audit-outcome";
import { AuditWriteFailedError } from "@/shared/audit/errors/audit-errors";

const mockCreate = vi.fn();

vi.mock("@/modules/audit/infra/audit-event.model", () => ({
  AuditEvent: {
    create: (...args: unknown[]) => mockCreate(...args),
  },
}));

vi.mock("@/shared/db/connect", () => ({
  connectMongo: vi.fn().mockResolvedValue(undefined),
}));

describe("writeAuditEvent", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("writes validated events", async () => {
    mockCreate.mockResolvedValue([
      {
        _id: { toString: () => "mongo-id" },
        eventId: "event-uuid",
        occurredAt: new Date("2026-01-01T00:00:00.000Z"),
      },
    ]);

    const { writeAuditEvent } = await import(
      "@/modules/audit/services/audit-writer.service"
    );

    const result = await writeAuditEvent({
      eventType: AuditEventType.AUTH_LOGIN_FAILURE,
      actor: { type: AuditActorType.SYSTEM, systemComponent: "auth.login" },
      action: "login",
      outcome: AuditOutcome.FAILURE,
    });

    expect(result?.eventId).toBe("event-uuid");
    expect(mockCreate).toHaveBeenCalled();
  });

  it("returns null on optional write failure", async () => {
    mockCreate.mockRejectedValue(new Error("db down"));

    const { writeAuditEvent } = await import(
      "@/modules/audit/services/audit-writer.service"
    );

    const result = await writeAuditEvent({
      eventType: AuditEventType.AUTH_LOGIN_FAILURE,
      actor: { type: AuditActorType.SYSTEM, systemComponent: "auth.login" },
      action: "login",
      outcome: AuditOutcome.FAILURE,
    });

    expect(result).toBeNull();
  });

  it("throws on mandatory write failure", async () => {
    mockCreate.mockRejectedValue(new Error("db down"));

    const { writeAuditEventMandatory } = await import(
      "@/modules/audit/services/audit-writer.service"
    );

    await expect(
      writeAuditEventMandatory(
        {
          eventType: AuditEventType.AUTH_LOGIN_FAILURE,
          actor: { type: AuditActorType.SYSTEM, systemComponent: "auth.login" },
          action: "login",
          outcome: AuditOutcome.FAILURE,
        },
        { session: {} as never },
      ),
    ).rejects.toBeInstanceOf(AuditWriteFailedError);
  });

  it("passes MongoDB session when provided", async () => {
    mockCreate.mockResolvedValue([
      {
        _id: { toString: () => "mongo-id" },
        eventId: "event-uuid",
        occurredAt: new Date(),
      },
    ]);

    const session = { id: "session-1" };
    const { writeAuditEventMandatory } = await import(
      "@/modules/audit/services/audit-writer.service"
    );

    await writeAuditEventMandatory(
      {
        eventType: AuditEventType.AUTH_LOGIN_FAILURE,
        actor: { type: AuditActorType.SYSTEM, systemComponent: "auth.login" },
        action: "login",
        outcome: AuditOutcome.FAILURE,
      },
      { session: session as never },
    );

    expect(mockCreate).toHaveBeenCalledWith(expect.any(Array), { session });
  });
});
