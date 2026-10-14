import { describe, expect, it } from "vitest";

import { FinancialSettingsVersionImmutableError } from "@/modules/financial-settings/domain/financial-settings-errors";
import {
  assertDraftMutationAllowed,
  assertDraftScopedFilter,
  assertPublishTransitionAllowed,
} from "@/modules/financial-settings/infra/financial-settings-version-immutability";
import { FinancialSettingsVersionStatus } from "@/modules/financial-settings/domain/financial-settings-version-status";

describe("financial settings version immutability guards", () => {
  it("allows draft to published transition in one update", () => {
    expect(() =>
      assertPublishTransitionAllowed(
        { status: FinancialSettingsVersionStatus.DRAFT, revision: 1 },
        { $set: { status: FinancialSettingsVersionStatus.PUBLISHED, versionNumber: 1 } },
      ),
    ).not.toThrow();
  });

  it("blocks updates when filter targets published documents", () => {
    expect(() =>
      assertDraftMutationAllowed(
        { status: FinancialSettingsVersionStatus.PUBLISHED },
        { $set: { currency: "ILS" } },
      ),
    ).toThrow(FinancialSettingsVersionImmutableError);
  });

  it("blocks delete filters that are not draft-scoped", () => {
    expect(() => assertDraftScopedFilter({})).toThrow(FinancialSettingsVersionImmutableError);
    expect(() =>
      assertDraftScopedFilter({ status: FinancialSettingsVersionStatus.DRAFT }),
    ).not.toThrow();
  });
});
