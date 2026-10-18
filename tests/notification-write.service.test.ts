import { beforeEach, describe, expect, it, vi } from "vitest";

const mockCreate = vi.fn();

vi.mock("@/shared/db/connect", () => ({
  connectMongo: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/modules/notifications/infra/notification.model", () => ({
  Notification: {
    create: (...args: unknown[]) => mockCreate(...args),
  },
}));

describe("notification write idempotency", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCreate.mockResolvedValue(undefined);
  });

  it("swallows duplicate key errors", async () => {
    mockCreate.mockRejectedValueOnce({ code: 11000 });
    const { insertNotificationsIdempotent } = await import(
      "@/modules/notifications/services/notification-write.service"
    );
    await expect(
      insertNotificationsIdempotent({
        notifications: [
          {
            recipientUserId: "507f1f77bcf86cd799439011",
            eventType: "debt_case_submitted",
            titleHe: "t",
            bodyHe: "b",
            entityType: "debt_case",
            entityId: "case-1",
            destinationPath: "/app/admin/debt-cases/case-1",
            idempotencyKey: "key-1",
          },
        ],
      }),
    ).resolves.toBeUndefined();
  });

  it("rethrows non-duplicate errors", async () => {
    mockCreate.mockRejectedValueOnce(new Error("db down"));
    const { insertNotificationsIdempotent } = await import(
      "@/modules/notifications/services/notification-write.service"
    );
    await expect(
      insertNotificationsIdempotent({
        notifications: [
          {
            recipientUserId: "507f1f77bcf86cd799439011",
            eventType: "debt_case_submitted",
            titleHe: "t",
            bodyHe: "b",
            entityType: "debt_case",
            entityId: "case-1",
            destinationPath: "/app/admin/debt-cases/case-1",
            idempotencyKey: "key-2",
          },
        ],
      }),
    ).rejects.toThrow("db down");
  });
});
