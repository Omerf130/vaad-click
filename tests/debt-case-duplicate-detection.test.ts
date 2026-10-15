import { describe, expect, it } from "vitest";

import {
  assertSuccessorCaseAllowed,
  findOverlappingOpenCase,
  normalizeDebtorDisplayNameForMatching,
} from "@/modules/debt-cases/domain/debt-case-duplicate-detection";
import { DebtCaseValidationFlagSeverity } from "@/modules/debt-cases/domain/debt-case-validation-flag";
import { DebtCaseWorkflowStatus } from "@/modules/debt-cases/domain/debt-case-workflow-status";
import { debtPeriodMonthsOverlap } from "@/modules/debt-cases/domain/debt-period";

const BUILDING_ID = "11111111-1111-4111-8111-111111111111";

describe("debtPeriodMonthsOverlap", () => {
  it("detects overlapping inclusive ranges", () => {
    expect(
      debtPeriodMonthsOverlap(
        { periodStartMonth: "2024-01", periodEndMonth: "2024-06" },
        { periodStartMonth: "2024-05", periodEndMonth: "2024-08" },
      ),
    ).toBe(true);
  });

  it("returns false for adjacent non-overlapping ranges", () => {
    expect(
      debtPeriodMonthsOverlap(
        { periodStartMonth: "2024-01", periodEndMonth: "2024-03" },
        { periodStartMonth: "2024-04", periodEndMonth: "2024-06" },
      ),
    ).toBe(false);
  });
});

describe("findOverlappingOpenCase", () => {
  it("blocks overlap within same building and apartment key", () => {
    const result = findOverlappingOpenCase({
      buildingId: BUILDING_ID,
      apartmentKeyNormalized: "12",
      periodStartMonth: "2024-04",
      periodEndMonth: "2024-06",
      candidates: [
        {
          debtCaseId: "22222222-2222-4222-8222-222222222222",
          buildingId: BUILDING_ID,
          apartmentKeyNormalized: "12",
          periodStartMonth: "2024-01",
          periodEndMonth: "2024-05",
          workflowStatus: DebtCaseWorkflowStatus.DRAFT,
          letterSentAtIso: null,
          debtorNameNormalized: null,
        },
      ],
    });
    expect(result.isBlockingOverlap).toBe(true);
  });

  it("ignores closed rejected cases", () => {
    const result = findOverlappingOpenCase({
      buildingId: BUILDING_ID,
      apartmentKeyNormalized: "12",
      periodStartMonth: "2024-01",
      periodEndMonth: "2024-02",
      candidates: [
        {
          debtCaseId: "22222222-2222-4222-8222-222222222222",
          buildingId: BUILDING_ID,
          apartmentKeyNormalized: "12",
          periodStartMonth: "2024-01",
          periodEndMonth: "2024-02",
          workflowStatus: DebtCaseWorkflowStatus.REJECTED,
          letterSentAtIso: null,
          debtorNameNormalized: null,
        },
      ],
    });
    expect(result.isBlockingOverlap).toBe(false);
  });
});

describe("successor case contract", () => {
  it("requires predecessor letter sent", () => {
    const flag = assertSuccessorCaseAllowed({ predecessorLetterSentAtIso: null });
    expect(flag?.severity).toBe(DebtCaseValidationFlagSeverity.BLOCK);
  });
});

describe("normalizeDebtorDisplayNameForMatching", () => {
  it("collapses whitespace and lowercases", () => {
    expect(normalizeDebtorDisplayNameForMatching("  Foo   BAR ")).toBe("foo bar");
  });
});
