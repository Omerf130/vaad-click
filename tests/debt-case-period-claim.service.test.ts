import { describe, expect, it, vi } from "vitest";
import { MongoServerError } from "mongodb";

vi.mock("@/modules/debt-cases/infra/debt-case-period-claim.model", () => ({
  DebtCasePeriodClaim: {
    insertMany: vi.fn(),
    deleteMany: vi.fn(),
  },
}));

import { DebtCasePeriodClaim } from "@/modules/debt-cases/infra/debt-case-period-claim.model";
import { DebtCaseErrorCode } from "@/modules/debt-cases/domain/debt-case-errors";
import { claimDebtCasePeriodMonths } from "@/modules/debt-cases/services/debt-case-period-claim.service";

describe("claimDebtCasePeriodMonths", () => {
  it("maps duplicate key to DUPLICATE_OVERLAP", async () => {
    vi.mocked(DebtCasePeriodClaim.insertMany).mockRejectedValue(
      new MongoServerError({ message: "dup", code: 11000 } as never),
    );

    await expect(
      claimDebtCasePeriodMonths({
        buildingId: "b1",
        apartmentKeyNormalized: "12",
        periodStartMonth: "2024-01",
        periodEndMonth: "2024-02",
        debtCaseId: "case-1",
        session: {} as never,
      }),
    ).rejects.toMatchObject({ code: DebtCaseErrorCode.DUPLICATE_OVERLAP });
  });

  it("expands inclusive months for claim insert", async () => {
    vi.mocked(DebtCasePeriodClaim.insertMany).mockResolvedValue([] as never);

    await claimDebtCasePeriodMonths({
      buildingId: "b1",
      apartmentKeyNormalized: "12",
      periodStartMonth: "2024-01",
      periodEndMonth: "2024-03",
      debtCaseId: "case-1",
      session: {} as never,
    });

    const payload = vi.mocked(DebtCasePeriodClaim.insertMany).mock.calls[0]?.[0] as {
      periodMonth: string;
    }[];
    expect(payload).toHaveLength(3);
    expect(payload.map((row) => row.periodMonth)).toEqual(["2024-01", "2024-02", "2024-03"]);
  });
});
