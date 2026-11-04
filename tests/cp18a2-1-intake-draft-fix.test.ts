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
const mockSave = vi.fn();

vi.mock("@/modules/debt-cases/infra/debt-case-intake-draft.model", () => ({
  DebtCaseIntakeDraft: {
    findOne: (...args: unknown[]) => mockFindOne(...args),
    create: (...args: unknown[]) => mockCreate(...args),
  },
}));

vi.mock("@/modules/debt-cases/services/debt-case-intake-building-resolver.service", () => ({
  resolveRepAssignedBuilding: vi.fn().mockResolvedValue(null),
  detectIntakeAddressCollision: vi.fn(),
  resolveBuildingIdForIntakeSubmit: vi.fn(),
}));

function mcContext(): AuthenticatedContext {
  return {
    user: {
      id: "507f1f77bcf86cd799439011",
      email: "mc@test.com",
      fullName: "MC",
      role: UserRole.MANAGEMENT_COMPANY,
      accountStatus: AccountStatus.ACTIVE,
      clientApprovalStatus: ClientApprovalStatus.AWAITING_SUBMISSION,
    },
    session: {} as AuthenticatedContext["session"],
  };
}

function repContext(): AuthenticatedContext {
  return {
    user: {
      id: "507f1f77bcf86cd799439012",
      email: "rep@test.com",
      fullName: "Rep",
      role: UserRole.BUILDING_REP,
      accountStatus: AccountStatus.ACTIVE,
      clientApprovalStatus: ClientApprovalStatus.AWAITING_SUBMISSION,
    },
    session: {} as AuthenticatedContext["session"],
  };
}

function mockFindOneNoPristine() {
  mockFindOne.mockReturnValue({
    sort: vi.fn().mockReturnValue({
      then: (resolve: (value: null) => void) => Promise.resolve(resolve(null)),
    }),
  });
}

describe("debtCaseIntakeDraftSaveSchema — empty building fields", () => {
  it("accepts empty address strings for draft save", async () => {
    const { debtCaseIntakeDraftSaveSchema } = await import(
      "@/modules/debt-cases/validation/debt-case-intake.schema"
    );
    const parsed = debtCaseIntakeDraftSaveSchema.safeParse({
      building: {
        mode: "new",
        displayName: "",
        address: { city: "", street: "", houseNumber: "" },
      },
      caseDraft: {},
    });
    expect(parsed.success).toBe(true);
  });

  it("rejects overlong draft city", async () => {
    const { debtCaseIntakeDraftSaveSchema } = await import(
      "@/modules/debt-cases/validation/debt-case-intake.schema"
    );
    const parsed = debtCaseIntakeDraftSaveSchema.safeParse({
      building: { mode: "new", address: { city: "x".repeat(121) } },
      caseDraft: {},
    });
    expect(parsed.success).toBe(false);
  });
});

describe("intakeBuildingSchema — submit", () => {
  it("rejects missing required building address on submit", async () => {
    const { intakeBuildingSchema } = await import(
      "@/modules/debt-cases/validation/debt-case-intake.schema"
    );
    const parsed = intakeBuildingSchema.safeParse({
      mode: "new",
      displayName: "בניין",
      address: { city: "", street: "", houseNumber: "" },
    });
    expect(parsed.success).toBe(false);
  });

  it("accepts complete building on submit", async () => {
    const { intakeBuildingSchema } = await import(
      "@/modules/debt-cases/validation/debt-case-intake.schema"
    );
    const parsed = intakeBuildingSchema.safeParse({
      mode: "new",
      displayName: "בניין",
      address: { city: "תל אביב", street: "דיזengoff", houseNumber: "1" },
    });
    expect(parsed.success).toBe(true);
  });
});

describe("createEmptyDebtCaseIntakeDraft", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCreate.mockResolvedValue(undefined);
    mockFindOneNoPristine();
  });

  it("creates empty draft for management company without building provisioning", async () => {
    const { createEmptyDebtCaseIntakeDraft } = await import(
      "@/modules/debt-cases/services/debt-case-intake.service"
    );
    const { resolveBuildingIdForIntakeSubmit } = await import(
      "@/modules/debt-cases/services/debt-case-intake-building-resolver.service"
    );
    const result = await createEmptyDebtCaseIntakeDraft({ context: mcContext() });
    expect(result.intakeDraftId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
    );
    expect(mockCreate).toHaveBeenCalledTimes(1);
    expect(resolveBuildingIdForIntakeSubmit).not.toHaveBeenCalled();
  });

  it("creates empty draft for building representative", async () => {
    const { createEmptyDebtCaseIntakeDraft } = await import(
      "@/modules/debt-cases/services/debt-case-intake.service"
    );
    const result = await createEmptyDebtCaseIntakeDraft({ context: repContext() });
    expect(result.revision).toBe(0);
    expect(mockCreate).toHaveBeenCalled();
  });
});

describe("saveDebtCaseIntakeDraft — pristine reuse", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCreate.mockResolvedValue(undefined);
  });

  it("reuses pristine draft instead of creating duplicate on save without id", async () => {
    const pristineDoc = {
      intakeDraftId: "11111111-1111-4111-8111-111111111111",
      revision: 0,
      buildingSnapshot: { displayName: "", city: "", street: "", houseNumber: "" },
      caseDraftJson: {},
      status: "draft",
      save: mockSave.mockResolvedValue(undefined),
    };
    mockFindOne.mockReturnValue({
      sort: vi.fn().mockReturnValue({
        then: (resolve: (value: typeof pristineDoc) => void) =>
          Promise.resolve(resolve(pristineDoc)),
      }),
    });
    mockFindOne.mockImplementationOnce(() => ({
      sort: vi.fn().mockReturnValue({
        then: (resolve: (value: typeof pristineDoc) => void) =>
          Promise.resolve(resolve(pristineDoc)),
      }),
    }));
    const findForOwned = vi.fn().mockResolvedValue(pristineDoc);
    mockFindOne.mockImplementation((query: { intakeDraftId?: string }) => {
      if (query.intakeDraftId) {
        return findForOwned();
      }
      return {
        sort: vi.fn().mockReturnValue({
          then: (resolve: (value: typeof pristineDoc) => void) =>
            Promise.resolve(resolve(pristineDoc)),
        }),
      };
    });

    const { saveDebtCaseIntakeDraft, isPristineIntakeDraft } = await import(
      "@/modules/debt-cases/services/debt-case-intake.service"
    );
    expect(isPristineIntakeDraft(pristineDoc)).toBe(true);

    const result = await saveDebtCaseIntakeDraft({
      context: mcContext(),
      payload: {
        building: { mode: "new", address: {} },
        caseDraft: { apartmentNumber: "5" },
      },
    });
    expect(result.intakeDraftId).toBe(pristineDoc.intakeDraftId);
    expect(mockCreate).not.toHaveBeenCalled();
    expect(mockSave).toHaveBeenCalled();
  });
});
