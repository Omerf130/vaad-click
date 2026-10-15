import { describe, expect, it, vi } from "vitest";

import { DebtCaseErrorCode } from "@/modules/debt-cases/domain/debt-case-errors";
import { DebtCaseWorkflowStatus } from "@/modules/debt-cases/domain/debt-case-workflow-status";
import {
  resolveAuthorizedBuildingIdForDraftCreate,
} from "@/modules/debt-cases/services/debt-case-authorization.service";
import { AccountStatus } from "@/modules/users/domain/account-status";
import { UserRole } from "@/modules/users/domain/user-role";
import type { AuthenticatedContext } from "@/shared/auth/get-authenticated-context";

vi.mock("@/shared/db/connect", () => ({
  connectMongo: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/shared/auth/building-access/assert-building-access", () => ({
  assertBuildingAccess: vi.fn().mockResolvedValue({ scope: { mode: "assigned" } }),
}));

vi.mock("@/modules/debt-cases/services/pending-building-onboarding.service", () => ({
  resolvePendingOnboardingBuildingForUser: vi.fn(),
}));

import { assertBuildingAccess } from "@/shared/auth/building-access/assert-building-access";
import { resolvePendingOnboardingBuildingForUser } from "@/modules/debt-cases/services/pending-building-onboarding.service";

const BUILDING_ID = "11111111-1111-4111-8111-111111111111";

function context(input: Partial<AuthenticatedContext["user"]>): AuthenticatedContext {
  return {
    user: {
      id: "aaaaaaaaaaaaaaaaaaaaaaaa",
      email: "test@example.com",
      role: UserRole.BUILDING_REP,
      accountStatus: AccountStatus.ACTIVE,
      ...input,
    },
  } as AuthenticatedContext;
}

describe("resolveAuthorizedBuildingIdForDraftCreate", () => {
  it("rejects pending user supplying client building id", async () => {
    await expect(
      resolveAuthorizedBuildingIdForDraftCreate({
        context: context({ accountStatus: AccountStatus.PENDING_APPROVAL }),
        clientBuildingId: BUILDING_ID,
      }),
    ).rejects.toMatchObject({ code: DebtCaseErrorCode.FORBIDDEN });
  });

  it("uses server-bound onboarding building for pending users", async () => {
    vi.mocked(resolvePendingOnboardingBuildingForUser).mockResolvedValue({
      onboardingRequestId: "req-1",
      buildingId: BUILDING_ID,
    });

    const result = await resolveAuthorizedBuildingIdForDraftCreate({
      context: context({ accountStatus: AccountStatus.PENDING_APPROVAL }),
      clientBuildingId: null,
    });

    expect(result.buildingId).toBe(BUILDING_ID);
    expect(result.pendingOnboardingRequestId).toBe("req-1");
    expect(assertBuildingAccess).not.toHaveBeenCalled();
  });

  it("requires building access for active operators", async () => {
    const result = await resolveAuthorizedBuildingIdForDraftCreate({
      context: context({ accountStatus: AccountStatus.ACTIVE }),
      clientBuildingId: BUILDING_ID,
    });
    expect(result.buildingId).toBe(BUILDING_ID);
    expect(assertBuildingAccess).toHaveBeenCalled();
  });
});

describe("pending draft scope", () => {
  it("documents draft-only pending access constant", () => {
    expect(DebtCaseWorkflowStatus.DRAFT).toBe("draft");
  });
});
