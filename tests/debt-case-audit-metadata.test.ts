import { describe, expect, it, vi } from "vitest";

vi.mock("@/modules/audit/services/audit-writer.service", () => ({
  writeAuditEventMandatory: vi.fn().mockResolvedValue({
    id: "1",
    eventId: "e1",
    occurredAt: new Date(),
  }),
}));

import { writeAuditEventMandatory } from "@/modules/audit/services/audit-writer.service";
import { recordDebtCaseSubmitted } from "@/modules/debt-cases/services/debt-case-audit.service";
import { AccountStatus } from "@/modules/users/domain/account-status";
import { UserRole } from "@/modules/users/domain/user-role";
import type { AuthenticatedContext } from "@/shared/auth/get-authenticated-context";

describe("debt case audit metadata privacy", () => {
  it("does not include apartment or debtor fields in metadata", async () => {
    const context: AuthenticatedContext = {
      user: {
        id: "aaaaaaaaaaaaaaaaaaaaaaaa",
        email: "lawyer@test.com",
        role: UserRole.LAWYER_ADMIN,
        accountStatus: AccountStatus.ACTIVE,
      },
    } as AuthenticatedContext;

    await recordDebtCaseSubmitted({
      context,
      debtCaseId: "22222222-2222-4222-8222-222222222222",
      buildingId: "11111111-1111-4111-8111-111111111111",
      revision: 2,
      lawyerReviewStatus: "pending",
      validationFlagCodes: ["legal_readiness_incomplete"],
      session: {} as never,
    });

    const payload = vi.mocked(writeAuditEventMandatory).mock.calls[0]?.[0];
    expect(payload?.metadata).toBeDefined();
    expect(JSON.stringify(payload?.metadata)).not.toMatch(/apartment/i);
    expect(payload?.metadata).toMatchObject({
      buildingId: "11111111-1111-4111-8111-111111111111",
      revision: 2,
    });
  });
});
