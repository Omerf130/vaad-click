import { describe, expect, it, vi } from "vitest";

import { UserRole } from "@/modules/users/domain/user-role";

const mockCount = vi.fn();
const mockFind = vi.fn();
const mockCreate = vi.fn();

vi.mock("@/modules/users/infra/user.model", () => ({
  User: {
    countDocuments: (...args: unknown[]) => mockCount(...args),
    find: (...args: unknown[]) => mockFind(...args),
    create: (...args: unknown[]) => mockCreate(...args),
  },
}));

vi.mock("@/shared/db/connect", () => ({
  connectMongo: vi.fn().mockResolvedValue(undefined),
}));

describe("bootstrapInitialLawyerAdmin", () => {
  it("refuses when a lawyer admin already exists", async () => {
    mockCount.mockResolvedValue(1);
    const { bootstrapInitialLawyerAdmin } = await import(
      "@/modules/users/services/bootstrap-initial-lawyer-admin"
    );
    const { LawyerAdminAlreadyExistsError } = await import(
      "@/modules/users/services/lawyer-admin-provision"
    );

    await expect(
      bootstrapInitialLawyerAdmin({
        fullName: "Test",
        email: "admin@example.com",
      }),
    ).rejects.toBeInstanceOf(LawyerAdminAlreadyExistsError);
  });

  it("creates admin without password hash field", async () => {
    mockCount.mockResolvedValue(0);
    mockCreate.mockResolvedValue({
      _id: { toString: () => "id-1" },
    });

    const { bootstrapInitialLawyerAdmin } = await import(
      "@/modules/users/services/bootstrap-initial-lawyer-admin"
    );

    const result = await bootstrapInitialLawyerAdmin({
      fullName: "Test Admin",
      email: "admin@example.com",
    });

    expect(result.passwordSetupRequired).toBe(true);
    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        role: UserRole.LAWYER_ADMIN,
        email: "admin@example.com",
      }),
    );
    expect(mockCreate.mock.calls[0][0].passwordHash).toBeUndefined();
  });
});
