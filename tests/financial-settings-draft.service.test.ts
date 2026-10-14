import { beforeEach, describe, expect, it, vi } from "vitest";

import { SessionAuthStage } from "@/modules/auth/domain/session-types";
import { AccountStatus } from "@/modules/users/domain/account-status";
import { UserRole } from "@/modules/users/domain/user-role";
import { FinancialSettingsErrorCode } from "@/modules/financial-settings/domain/financial-settings-errors";
import type { AuthenticatedContext } from "@/shared/auth/get-authenticated-context";

const mockWithTransaction = vi.fn(async (fn: () => Promise<void>) => fn());
const mockEndSession = vi.fn();
const mockFindOne = vi.fn();
const mockCreate = vi.fn();
const mockFindOneAndUpdate = vi.fn();
const mockDeleteOne = vi.fn();

vi.mock("mongoose", async () => {
  const actual = await vi.importActual<typeof import("mongoose")>("mongoose");
  return {
    default: {
      startSession: () => ({
        withTransaction: mockWithTransaction,
        endSession: mockEndSession,
      }),
    },
    Types: actual.Types,
  };
});

vi.mock("@/modules/financial-settings/infra/financial-settings-version.model", () => ({
  FinancialSettingsVersion: {
    findOne: (...args: unknown[]) => mockFindOne(...args),
    create: (...args: unknown[]) => mockCreate(...args),
    findOneAndUpdate: (...args: unknown[]) => mockFindOneAndUpdate(...args),
    deleteOne: (...args: unknown[]) => mockDeleteOne(...args),
  },
  FinancialSettingsVersionStatus: {
    DRAFT: "draft",
    PUBLISHED: "published",
  },
}));

const mockRecordCreated = vi.fn();
const mockRecordUpdated = vi.fn();
const mockRecordDiscarded = vi.fn();

vi.mock("@/modules/audit/services/financial-settings-audit.service", () => ({
  recordFinancialSettingsDraftCreated: (...args: unknown[]) => mockRecordCreated(...args),
  recordFinancialSettingsDraftUpdated: (...args: unknown[]) => mockRecordUpdated(...args),
  recordFinancialSettingsDraftDiscarded: (...args: unknown[]) => mockRecordDiscarded(...args),
}));

vi.mock("@/shared/db/connect", () => ({
  connectMongo: vi.fn().mockResolvedValue(undefined),
}));

const context: AuthenticatedContext = {
  user: {
    id: "507f1f77bcf86cd799439011",
    fullName: "Lawyer",
    email: "lawyer@example.com",
    role: UserRole.LAWYER_ADMIN,
    accountStatus: AccountStatus.ACTIVE,
  },
  session: {
    userId: "507f1f77bcf86cd799439011",
    authStage: SessionAuthStage.MFA_COMPLETE,
    expiresAt: new Date(Date.now() + 60_000),
    revokedAt: null,
  },
};

describe("financial settings draft service transactions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFindOne.mockReturnValue({
      session: () => ({ lean: async () => null }),
      lean: async () => null,
    });
    mockCreate.mockResolvedValue([{ settingsVersionId: "new-draft" }]);
    mockRecordCreated.mockResolvedValue(undefined);
    mockRecordUpdated.mockResolvedValue(undefined);
    mockRecordDiscarded.mockResolvedValue(undefined);
    mockDeleteOne.mockResolvedValue({ deletedCount: 1 });
  });

  it("rolls back draft creation when mandatory audit fails", async () => {
    const { AuditWriteFailedError } = await import("@/shared/audit/errors/audit-errors");
    mockRecordCreated.mockRejectedValue(new AuditWriteFailedError());

    const { createFinancialSettingsDraft } = await import(
      "@/modules/financial-settings/services/financial-settings-draft.service"
    );

    await expect(createFinancialSettingsDraft({ context })).rejects.toMatchObject({
      code: FinancialSettingsErrorCode.AUDIT_PERSISTENCE,
    });
  });

  it("records mandatory audit when discarding a draft", async () => {
    mockFindOne.mockReturnValue({
      session: () => ({
        lean: async () => ({
          _id: "draft-id",
          settingsVersionId: "draft-1",
          revision: 2,
        }),
      }),
    });

    const { discardFinancialSettingsDraft } = await import(
      "@/modules/financial-settings/services/financial-settings-draft.service"
    );

    await discardFinancialSettingsDraft({ context });
    expect(mockRecordDiscarded).toHaveBeenCalledWith(
      expect.objectContaining({ settingsVersionId: "draft-1", revision: 2 }),
    );
    expect(mockDeleteOne).toHaveBeenCalled();
  });
});
