import { beforeEach, describe, expect, it, vi } from "vitest";

import { DebtCaseLawyerReviewStatus } from "@/modules/debt-cases/domain/debt-case-lawyer-review-status";
import { WarningLetterErrorCode } from "@/modules/warning-letters/domain/warning-letter-errors";
import { AccountStatus } from "@/modules/users/domain/account-status";
import { UserRole } from "@/modules/users/domain/user-role";
import type { AuthenticatedContext } from "@/shared/auth/get-authenticated-context";

const mockGetDebtCase = vi.fn();
const mockBuildingFindOne = vi.fn();
const mockMcFindById = vi.fn();
const mockResolveSettings = vi.fn();

vi.mock("@/shared/db/connect", () => ({
  connectMongo: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/modules/debt-cases/services/debt-case.service", () => ({
  getDebtCase: (...args: unknown[]) => mockGetDebtCase(...args),
}));

vi.mock("@/modules/buildings/infra/building.model", () => ({
  Building: {
    findOne: (...args: unknown[]) => mockBuildingFindOne(...args),
  },
}));

vi.mock("@/modules/management-companies/infra/management-company.model", () => ({
  ManagementCompany: {
    findById: (...args: unknown[]) => mockMcFindById(...args),
  },
}));

vi.mock("@/modules/financial-settings/services/financial-settings-query.service", () => ({
  resolveApplicableFinancialSettingsVersion: (...args: unknown[]) => mockResolveSettings(...args),
}));

const lawyerContext = {
  user: {
    id: "aaaaaaaaaaaaaaaaaaaaaaaa",
    email: "lawyer@test.com",
    role: UserRole.LAWYER_ADMIN,
    accountStatus: AccountStatus.ACTIVE,
  },
} as AuthenticatedContext;

describe("loadWarningLetterPreviewForDebtCase", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejects when case not approved for letter prep", async () => {
    const { loadWarningLetterPreviewForDebtCase } = await import(
      "@/modules/warning-letters/services/warning-letter-preview.service"
    );
    mockGetDebtCase.mockResolvedValue({
      debtCaseId: "c1",
      buildingId: "b1",
      lawyerReviewStatus: DebtCaseLawyerReviewStatus.PENDING,
      parties: { propertyOwners: [{ fullName: "X" }], tenant: null },
      apartmentNumberDisplay: "1",
      principalAmountMinor: 10000,
      periodStartMonth: "2026-01",
      periodEndMonth: "2026-01",
    });

    await expect(
      loadWarningLetterPreviewForDebtCase({ context: lawyerContext, debtCaseId: "c1" }),
    ).rejects.toMatchObject({ code: WarningLetterErrorCode.CASE_NOT_APPROVED_FOR_LETTER_PREP });
  });
});
