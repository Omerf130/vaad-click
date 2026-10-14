import { beforeEach, describe, expect, it, vi } from "vitest";

import { CommitteeEngagementErrorCode } from "@/modules/committee-engagements/domain/engagement-errors";
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

const buildingFindOne = vi.fn();
const engagementFindOne = vi.fn();
const engagementCreate = vi.fn();
const engagementUpdateOne = vi.fn();

vi.mock("@/modules/buildings/infra/building.model", () => ({
  Building: {
    findOne: (...args: unknown[]) => buildingFindOne(...args),
  },
}));

vi.mock("@/modules/committee-engagements/infra/committee-engagement.model", () => ({
  CommitteeEngagement: {
    findOne: (...args: unknown[]) => engagementFindOne(...args),
    create: (...args: unknown[]) => engagementCreate(...args),
    updateOne: (...args: unknown[]) => engagementUpdateOne(...args),
  },
}));

const mockResolveVersion = vi.fn();
const mockMaterialize = vi.fn();

vi.mock("@/modules/financial-settings/services/financial-settings-query.service", () => ({
  resolveApplicableFinancialSettingsVersion: (...args: unknown[]) => mockResolveVersion(...args),
}));

vi.mock("@/modules/financial-settings/services/financial-settings-snapshot.service", () => ({
  materializeFinancialSettingsSnapshot: (...args: unknown[]) => mockMaterialize(...args),
}));

const mockCaptured = vi.fn();
const mockReplaced = vi.fn();

vi.mock("@/modules/organizations/services/organization-audit.service", () => ({
  recordCommitteeEngagementProposedTermsCaptured: (...args: unknown[]) => mockCaptured(...args),
  recordCommitteeEngagementProposedTermsReplaced: (...args: unknown[]) => mockReplaced(...args),
}));

vi.mock("@/shared/db/connect", () => ({
  connectMongo: vi.fn().mockResolvedValue(undefined),
}));

function lawyerContext(): AuthenticatedContext {
  return {
    user: {
      id: "507f1f77bcf86cd799439099",
      email: "lawyer@firm.com",
      fullName: "Lawyer",
      role: UserRole.LAWYER_ADMIN,
      accountStatus: AccountStatus.ACTIVE,
    },
    session: {} as AuthenticatedContext["session"],
  };
}

const snapshot = {
  disclaimer: "test",
  settingsVersionId: "v1",
  versionNumber: 2,
  amountsMonetaryBasis: "legacy_net_exclusive_vat",
  platformFees: {
    trustAccountProcessingFeeBasisPoints: 230,
    committeeTransferFeeBasisPoints: 50,
  },
  amounts: {
    amountsMonetaryBasis: "legacy_net_exclusive_vat",
    debtorTreatmentFeeExVat: { currency: "ILS", amountMinor: 100 },
    committeeTreatmentFeeWhenDebtorWaivedExVat: { currency: "ILS", amountMinor: 100 },
  },
  escalation: { recoveryFeeRateBasisPoints: 2000 },
};

describe("committee engagement service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    buildingFindOne.mockReturnValue({
      lean: async () => ({ buildingId: "11111111-1111-4111-8111-111111111111" }),
    });
    mockResolveVersion.mockResolvedValue({
      settingsVersionId: "settings-1",
      versionNumber: 2,
      platformFees: {
        trustAccountProcessingFeeBasisPoints: 230,
        committeeTransferFeeBasisPoints: 50,
      },
    });
    mockMaterialize.mockReturnValue(snapshot);
    engagementFindOne.mockReturnValue({
      session: () => ({ lean: async () => null }),
    });
    engagementCreate.mockResolvedValue([{ engagementId: "eng-1" }]);
    mockCaptured.mockResolvedValue(undefined);
    mockReplaced.mockResolvedValue(undefined);
  });

  it("rejects capture when financial version lacks platform fees", async () => {
    mockResolveVersion.mockResolvedValue({
      settingsVersionId: "legacy",
      versionNumber: 1,
      platformFees: undefined,
    });

    const { captureOrReplaceProposedCommitteeTerms } = await import(
      "@/modules/committee-engagements/services/committee-engagement.service"
    );

    await expect(
      captureOrReplaceProposedCommitteeTerms({
        context: lawyerContext(),
        buildingId: "11111111-1111-4111-8111-111111111111",
      }),
    ).rejects.toMatchObject({ code: CommitteeEngagementErrorCode.FINANCIAL_VERSION_INCOMPLETE });
  });

  it("captures proposed terms with mandatory audit", async () => {
    const { captureOrReplaceProposedCommitteeTerms } = await import(
      "@/modules/committee-engagements/services/committee-engagement.service"
    );

    const result = await captureOrReplaceProposedCommitteeTerms({
      context: lawyerContext(),
      buildingId: "11111111-1111-4111-8111-111111111111",
    });

    expect(result.replaced).toBe(false);
    expect(mockCaptured).toHaveBeenCalled();
    expect(engagementCreate).toHaveBeenCalled();
    const createPayload = engagementCreate.mock.calls[0][0][0];
    expect(createPayload.outboundTransfersAllowed).toBe(false);
    expect(createPayload.signedAt).toBeNull();
  });

  it("rolls back when audit fails", async () => {
    mockCaptured.mockRejectedValue(new AuditWriteFailedError());

    const { captureOrReplaceProposedCommitteeTerms } = await import(
      "@/modules/committee-engagements/services/committee-engagement.service"
    );

    await expect(
      captureOrReplaceProposedCommitteeTerms({
        context: lawyerContext(),
        buildingId: "11111111-1111-4111-8111-111111111111",
      }),
    ).rejects.toMatchObject({ code: CommitteeEngagementErrorCode.AUDIT_PERSISTENCE });
  });
});
