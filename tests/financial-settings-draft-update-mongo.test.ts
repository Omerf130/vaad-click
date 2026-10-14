import { beforeEach, describe, expect, it, vi } from "vitest";

import { SessionAuthStage } from "@/modules/auth/domain/session-types";
import { AmountsMonetaryBasis } from "@/modules/financial-settings/domain/amounts-monetary-basis";
import { AccountStatus } from "@/modules/users/domain/account-status";
import { UserRole } from "@/modules/users/domain/user-role";
import { mapDraftFormToContentInput } from "@/modules/financial-settings/validation/financial-settings-form.schema";
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

vi.mock("@/modules/audit/services/financial-settings-audit.service", () => ({
  recordFinancialSettingsDraftUpdated: vi.fn().mockResolvedValue(undefined),
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

describe("financial settings draft update mongo payload", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFindOne.mockImplementation((filter: { settingsVersionId?: string }) => {
      const doc = {
        _id: "draft-id",
        settingsVersionId: "draft-1",
        revision: filter.settingsVersionId ? 2 : 1,
        amountsMonetaryBasis: AmountsMonetaryBasis.GROSS_INCLUSIVE_VAT,
        amounts: {
          debtorTreatmentFeeGross: { currency: "ILS", amountMinor: 32706 },
        },
      };
      return {
        session: () => ({
          lean: async () => (filter.settingsVersionId ? doc : { ...doc, revision: 1, amounts: { debtorTreatmentFeeExVat: { currency: "ILS", amountMinor: 27700 } } }),
        }),
        lean: async () => doc,
      };
    });
    mockFindOneAndUpdate.mockReturnValue({
      session: () => ({
        lean: async () => ({
          settingsVersionId: "draft-1",
          revision: 2,
          amountsMonetaryBasis: AmountsMonetaryBasis.GROSS_INCLUSIVE_VAT,
        }),
      }),
      lean: async () => ({
        settingsVersionId: "draft-1",
        revision: 2,
        amountsMonetaryBasis: AmountsMonetaryBasis.GROSS_INCLUSIVE_VAT,
      }),
    });
  });

  it("does not combine $set on amounts with $unset on amounts.* (Mongo path conflict)", async () => {
    const mapped = mapDraftFormToContentInput({
      fields: {
        revision: 1,
        debtorTreatmentFeeShekels: "327.06",
        committeeAssumedTreatmentFeeShekels: "150",
        trustAccountProcessingFeePercent: "2.3",
        committeeTransferFeePercent: "0.5",
        escalationPercent: "20",
      },
      vatRows: [{ effectiveFromIso: "2026-10-14", ratePercent: "18" }],
    });
    expect(mapped.ok).toBe(true);
    if (!mapped.ok) {
      throw new Error(JSON.stringify(mapped.fieldErrors));
    }

    const { updateFinancialSettingsDraft } = await import(
      "@/modules/financial-settings/services/financial-settings-draft.service"
    );

    await updateFinancialSettingsDraft({
      context,
      revision: 1,
      content: mapped.content,
    });

    const updateArg = mockFindOneAndUpdate.mock.calls[0]?.[1] as {
      $set?: Record<string, unknown>;
      $unset?: Record<string, unknown>;
    };
    expect(updateArg.$set?.amounts).toBeDefined();
    expect(updateArg.$unset).toBeUndefined();
  });
});
