import { beforeEach, describe, expect, it, vi } from "vitest";

import { AccountStatus } from "@/modules/users/domain/account-status";
import { UserRole } from "@/modules/users/domain/user-role";
import type { AuthenticatedContext } from "@/shared/auth/get-authenticated-context";

const mockUpdateOne = vi.fn();
const mockUpdateMany = vi.fn();
const mockCount = vi.fn();
const mockFind = vi.fn();
const mockAssertDest = vi.fn();

vi.mock("@/shared/db/connect", () => ({
  connectMongo: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/modules/notifications/infra/notification.model", () => ({
  Notification: {
    countDocuments: (...args: unknown[]) => mockCount(...args),
    find: (...args: unknown[]) => mockFind(...args),
    updateOne: (...args: unknown[]) => mockUpdateOne(...args),
    updateMany: (...args: unknown[]) => mockUpdateMany(...args),
  },
}));

vi.mock("@/modules/notifications/services/notification-destination.service", () => ({
  assertCanAccessNotificationDestination: (...args: unknown[]) => mockAssertDest(...args),
}));

function userContext(id: string): AuthenticatedContext {
  return {
    user: {
      id,
      role: UserRole.BUILDING_REP,
      accountStatus: AccountStatus.ACTIVE,
      fullName: "Rep",
      email: "rep@test.com",
    },
  } as AuthenticatedContext;
}

describe("notification query scoping", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUpdateOne.mockResolvedValue({ matchedCount: 1 });
    mockUpdateMany.mockResolvedValue({ modifiedCount: 2 });
    mockCount.mockResolvedValue(3);
    mockAssertDest.mockImplementation(async ({ fallbackPath }: { fallbackPath: string }) => fallbackPath);
    mockFind.mockReturnValue({
      sort: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      lean: vi.fn().mockResolvedValue([]),
    });
  });

  it("counts unread only for session user", async () => {
    const { countUnreadNotifications } = await import(
      "@/modules/notifications/services/notification-query.service"
    );
    await countUnreadNotifications(userContext("507f1f77bcf86cd799439011"));
    expect(mockCount).toHaveBeenCalledWith(
      expect.objectContaining({
        recipientUserId: expect.anything(),
        readAt: null,
      }),
    );
  });

  it("marks read with recipient filter", async () => {
    const { markNotificationRead } = await import(
      "@/modules/notifications/services/notification-query.service"
    );
    await markNotificationRead({
      context: userContext("507f1f77bcf86cd799439011"),
      notificationId: "notif-1",
    });
    expect(mockUpdateOne).toHaveBeenCalledWith(
      {
        notificationId: "notif-1",
        recipientUserId: expect.anything(),
      },
      { $set: { readAt: expect.any(Date) } },
    );
  });

  it("mark all read scoped to user", async () => {
    const { markAllNotificationsRead } = await import(
      "@/modules/notifications/services/notification-query.service"
    );
    await markAllNotificationsRead(userContext("507f1f77bcf86cd799439011"));
    expect(mockUpdateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        readAt: null,
      }),
      { $set: { readAt: expect.any(Date) } },
    );
  });
});
