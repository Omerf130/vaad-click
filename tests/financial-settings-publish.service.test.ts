import { beforeEach, describe, expect, it, vi } from "vitest";

import { SessionAuthStage } from "@/modules/auth/domain/session-types";
import { AccountStatus } from "@/modules/users/domain/account-status";
import { UserRole } from "@/modules/users/domain/user-role";
import { CourtCostsPolicy } from "@/modules/financial-settings/domain/court-costs-policy";
import { EscalationCalculationBase } from "@/modules/financial-settings/domain/escalation-calculation-base";
import { FinancialSettingsErrorCode } from "@/modules/financial-settings/domain/financial-settings-errors";
import type { AuthenticatedContext } from "@/shared/auth/get-authenticated-context";

const mockWithTransaction = vi.fn(async (fn: () => Promise<void>) => fn());
const mockEndSession = vi.fn();
const mockFindOne = vi.fn();
const mockFindOneAndUpdate = vi.fn();

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
    findOneAndUpdate: (...args: unknown[]) => mockFindOneAndUpdate(...args),
  },
}));

vi.mock("@/modules/financial-settings/services/financial-settings-counter.service", () => ({
  allocatePublishedVersionNumber: vi.fn().mockResolvedValue(1),
}));

const mockRecordPublished = vi.fn();

vi.mock("@/modules/audit/services/financial-settings-audit.service", () => ({
  recordFinancialSettingsVersionPublished: (...args: unknown[]) => mockRecordPublished(...args),
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

function futurePublishPayload(revision: number) {
  return {
    revision,
    effectiveFromIso: "2030-06-01",
    currency: "ILS" as const,
    amounts: {
      debtorTreatmentFeeExVat: { currency: "ILS" as const, amountMinor: 100 },
      committeeTreatmentFeeWhenDebtorWaivedExVat: { currency: "ILS" as const, amountMinor: 200 },
    },
    vatSchedule: [{ effectiveFromIso: "2030-01-01", rateBasisPoints: 1800 }],
    escalation: {
      recoveryFeeRateBasisPoints: 2000,
      calculationBase: EscalationCalculationBase.UNSPECIFIED,
      courtCostsPolicy: CourtCostsPolicy.UNSPECIFIED,
    },
  };
}

describe("financial settings publish service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRecordPublished.mockResolvedValue(undefined);
  });

  it("rejects retroactive effective dates", async () => {
    const { publishFinancialSettingsDraft } = await import(
      "@/modules/financial-settings/services/financial-settings-publish.service"
    );

    await expect(
      publishFinancialSettingsDraft({
        context,
        payload: {
          ...futurePublishPayload(1),
          effectiveFromIso: "2020-01-01",
        },
      }),
    ).rejects.toMatchObject({
      code: FinancialSettingsErrorCode.RETROACTIVE_EFFECTIVE_DATE,
    });
  });

  it("rolls back publication when mandatory audit fails", async () => {
    const { AuditWriteFailedError } = await import("@/shared/audit/errors/audit-errors");
    mockFindOne.mockReturnValue({
      session: () => ({
        lean: async () => ({
          _id: "draft-id",
          settingsVersionId: "draft-1",
          revision: 1,
          status: "draft",
        }),
      }),
      lean: async () => null,
    });
    mockFindOneAndUpdate.mockReturnValue({
      lean: async () => ({
        settingsVersionId: "draft-1",
        status: "published",
        versionNumber: 1,
        effectiveFrom: new Date("2030-06-01T00:00:00Z"),
        publishedAt: new Date(),
        currency: "ILS",
        amounts: futurePublishPayload(1).amounts,
        vatSchedule: [{ effectiveFrom: new Date("2030-01-01T00:00:00Z"), rateBasisPoints: 1800 }],
        escalation: futurePublishPayload(1).escalation,
      }),
    });
    mockRecordPublished.mockRejectedValue(new AuditWriteFailedError());

    const { publishFinancialSettingsDraft } = await import(
      "@/modules/financial-settings/services/financial-settings-publish.service"
    );

    await expect(
      publishFinancialSettingsDraft({
        context,
        payload: futurePublishPayload(1),
      }),
    ).rejects.toMatchObject({
      code: FinancialSettingsErrorCode.AUDIT_PERSISTENCE,
    });
  });
});
