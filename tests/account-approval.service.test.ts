import { beforeEach, describe, expect, it, vi } from "vitest";

import { OrganizationErrorCode } from "@/modules/buildings/domain/organization-errors";
import { AccountStatus } from "@/modules/users/domain/account-status";
import { UserRole } from "@/modules/users/domain/user-role";
import type { AuthenticatedContext } from "@/shared/auth/get-authenticated-context";
import { AuditWriteFailedError } from "@/shared/audit/errors/audit-errors";

const mockWithTransaction = vi.fn(async (fn: () => Promise<void>) => fn());
const mockEndSession = vi.fn();

const mongooseTypes = {
  ObjectId: Object.assign(
    class {
      constructor(public id: string) {}
      toString() {
        return this.id;
      }
    },
    { isValid: (id: string) => /^[a-f0-9]{24}$/i.test(id) },
  ),
};

vi.mock("mongoose", () => ({
  default: {
    startSession: () => ({
      withTransaction: mockWithTransaction,
      endSession: mockEndSession,
    }),
    Types: mongooseTypes,
  },
  Types: mongooseTypes,
}));

const mockFindById = vi.fn();
const mockFindOneAndUpdate = vi.fn();

vi.mock("@/modules/users/infra/user.model", () => ({
  User: {
    findById: (...args: unknown[]) => mockFindById(...args),
    findOneAndUpdate: (...args: unknown[]) => mockFindOneAndUpdate(...args),
  },
}));

const mockRecordApproved = vi.fn();
const mockRecordRejected = vi.fn();

vi.mock("@/modules/organizations/services/organization-audit.service", () => ({
  recordAccountApproved: (...args: unknown[]) => mockRecordApproved(...args),
  recordAccountRejected: (...args: unknown[]) => mockRecordRejected(...args),
  recordAccountReconsidered: vi.fn(),
}));

vi.mock("@/shared/db/connect", () => ({
  connectMongo: vi.fn().mockResolvedValue(undefined),
}));

function lawyerContext(): AuthenticatedContext {
  return {
    user: {
      id: "lawyer-1",
      email: "lawyer@firm.com",
      fullName: "Lawyer",
      role: UserRole.LAWYER_ADMIN,
      accountStatus: AccountStatus.ACTIVE,
    },
    session: {} as AuthenticatedContext["session"],
  };
}

describe("account approval services", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFindById.mockReturnValue({
      lean: async () => ({
        _id: "target-1",
        role: UserRole.BUILDING_REP,
        accountStatus: AccountStatus.PENDING_APPROVAL,
      }),
    });
    mockFindOneAndUpdate.mockReturnValue({
      lean: async () => ({ accountStatus: AccountStatus.ACTIVE }),
    });
    mockRecordApproved.mockResolvedValue(undefined);
    mockRecordRejected.mockResolvedValue(undefined);
  });

  it("requires lawyer admin", async () => {
    const { approveRegisteredAccount } = await import(
      "@/modules/organizations/services/account-approval.service"
    );
    const repContext: AuthenticatedContext = {
      user: {
        id: "rep-1",
        email: "rep@example.com",
        fullName: "Rep",
        role: UserRole.BUILDING_REP,
        accountStatus: AccountStatus.ACTIVE,
      },
      session: {} as AuthenticatedContext["session"],
    };

    await expect(
      approveRegisteredAccount({ context: repContext, targetUserId: "507f1f77bcf86cd799439011" }),
    ).rejects.toMatchObject({ code: OrganizationErrorCode.FORBIDDEN });
  });

  it("rolls back approval when mandatory audit fails", async () => {
    mockRecordApproved.mockRejectedValue(new AuditWriteFailedError());

    const { approveRegisteredAccount } = await import(
      "@/modules/organizations/services/account-approval.service"
    );

    await expect(
      approveRegisteredAccount({
        context: lawyerContext(),
        targetUserId: "507f1f77bcf86cd799439011",
      }),
    ).rejects.toMatchObject({ code: OrganizationErrorCode.AUDIT_PERSISTENCE });
  });
});
