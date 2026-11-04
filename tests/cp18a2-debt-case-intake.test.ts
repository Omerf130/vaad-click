import { beforeEach, describe, expect, it, vi } from "vitest";

import { AccountStatus } from "@/modules/users/domain/account-status";
import { ClientApprovalStatus } from "@/modules/users/domain/client-approval-status";
import { UserRole } from "@/modules/users/domain/user-role";
import type { AuthenticatedContext } from "@/shared/auth/get-authenticated-context";

vi.mock("@/shared/db/connect", () => ({
  connectMongo: vi.fn().mockResolvedValue(undefined),
}));

const mockFindOne = vi.fn();
const mockCreate = vi.fn();
const mockUpdateOne = vi.fn();
const mockFind = vi.fn();

function mockFindOneNoPristine() {
  mockFindOne.mockReturnValue({
    sort: vi.fn().mockReturnValue({
      then: (resolve: (value: null) => void) => Promise.resolve(resolve(null)),
    }),
  });
}

vi.mock("@/modules/debt-cases/infra/debt-case-intake-draft.model", () => ({
  DebtCaseIntakeDraft: {
    findOne: (...args: unknown[]) => mockFindOne(...args),
    create: (...args: unknown[]) => mockCreate(...args),
    updateOne: (...args: unknown[]) => mockUpdateOne(...args),
    find: (...args: unknown[]) => mockFind(...args),
  },
}));

vi.mock("@/modules/debt-cases/services/debt-case-intake-building-resolver.service", () => ({
  resolveRepAssignedBuilding: vi.fn().mockResolvedValue(null),
  detectIntakeAddressCollision: vi.fn().mockResolvedValue({ collision: false }),
  resolveBuildingIdForIntakeSubmit: vi.fn(),
}));

function repContext(): AuthenticatedContext {
  return {
    user: {
      id: "507f1f77bcf86cd799439011",
      email: "rep@test.com",
      fullName: "Rep",
      role: UserRole.BUILDING_REP,
      accountStatus: AccountStatus.ACTIVE,
      clientApprovalStatus: ClientApprovalStatus.AWAITING_SUBMISSION,
    },
    session: {} as AuthenticatedContext["session"],
  };
}

describe("saveDebtCaseIntakeDraft", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCreate.mockResolvedValue(undefined);
    mockFindOneNoPristine();
  });

  it("creates a new intake draft without requiring a building record", async () => {
    const { saveDebtCaseIntakeDraft } = await import(
      "@/modules/debt-cases/services/debt-case-intake.service"
    );
    const result = await saveDebtCaseIntakeDraft({
      context: repContext(),
      payload: {
        building: { mode: "new", displayName: "בניין", address: { city: "תל אביב", street: "א", houseNumber: "1" } },
        caseDraft: { apartmentNumber: "3" },
      },
    });
    expect(result.intakeDraftId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
    );
    expect(mockCreate).toHaveBeenCalled();
  });
});

describe("debtCaseIntakeDraftSaveSchema", () => {
  it("allows partial building on draft save", async () => {
    const { debtCaseIntakeDraftSaveSchema } = await import(
      "@/modules/debt-cases/validation/debt-case-intake.schema"
    );
    const parsed = debtCaseIntakeDraftSaveSchema.safeParse({
      building: { mode: "new", address: {} },
      caseDraft: {},
    });
    expect(parsed.success).toBe(true);
  });
});
