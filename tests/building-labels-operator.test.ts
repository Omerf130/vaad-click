import { describe, expect, it } from "vitest";

import { LawyerVerificationStatus } from "@/modules/buildings/domain/building-status";
import { formatLawyerVerificationStatusHeForOperator } from "@/modules/buildings/presentation/building-labels.he";

describe("operator building verification labels", () => {
  it("does not imply letter dispatch for not_started", () => {
    const label = formatLawyerVerificationStatusHeForOperator(LawyerVerificationStatus.NOT_STARTED);
    expect(label).toContain("טרם אומת");
  });
});
