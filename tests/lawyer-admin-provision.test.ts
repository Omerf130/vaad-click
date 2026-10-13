import { beforeEach, describe, expect, it, vi } from "vitest";

const mockCount = vi.fn();
const mockCreate = vi.fn();

vi.mock("@/modules/users/infra/user.model", () => ({
  User: {
    countDocuments: (...args: unknown[]) => mockCount(...args),
    create: (...args: unknown[]) => mockCreate(...args),
  },
}));

vi.mock("@/shared/db/connect", () => ({
  connectMongo: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/shared/security/password", () => ({
  hashPassword: vi.fn().mockResolvedValue("hashed"),
}));

describe("createLawyerAdministrator", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejects when a lawyer admin already exists", async () => {
    mockCount.mockResolvedValue(1);
    const { createLawyerAdministrator, LawyerAdminAlreadyExistsError } =
      await import("@/modules/users/services/lawyer-admin-provision");

    await expect(
      createLawyerAdministrator({
        fullName: "Admin",
        email: "admin@example.com",
        password: "valid-password-12",
      }),
    ).rejects.toBeInstanceOf(LawyerAdminAlreadyExistsError);
  });
});
