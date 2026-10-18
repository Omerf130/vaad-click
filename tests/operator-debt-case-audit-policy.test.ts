import { describe, expect, it } from "vitest";

import { AuditEventType } from "@/shared/audit/domain/audit-event-taxonomy";
import { isOperatorVisibleDebtCaseAuditEventType } from "@/modules/portal/domain/operator-debt-case-audit-policy";
import { formatOperatorDebtCaseActivityTitleHe } from "@/modules/portal/presentation/operator-debt-case-activity.he";

describe("operator debt case audit policy", () => {
  it("allows draft updated events for operator timeline", () => {
    expect(isOperatorVisibleDebtCaseAuditEventType(AuditEventType.DEBT_CASE_DRAFT_UPDATED)).toBe(
      true,
    );
  });

  it("labels draft updated in Hebrew", () => {
    expect(formatOperatorDebtCaseActivityTitleHe(AuditEventType.DEBT_CASE_DRAFT_UPDATED)).toBe(
      "טיוטת התיק עודכנה",
    );
  });
});
