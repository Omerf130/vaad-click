import { describe, expect, it } from "vitest";

import { AccountStatus } from "@/modules/users/domain/account-status";
import { ClientApprovalStatus } from "@/modules/users/domain/client-approval-status";
import {
  canAccessOperatorPortal,
  canOperatorSubmitDebtCase,
  isClientApproved,
  resolveEffectiveClientApprovalStatus,
} from "@/modules/users/domain/client-portal-access";
import { UserRole } from "@/modules/users/domain/user-role";
import { buildOperatorDebtCaseVisibilityFilter } from "@/modules/debt-cases/domain/operator-debt-case-scope";
import { DebtCaseWorkflowStatus } from "@/modules/debt-cases/domain/debt-case-workflow-status";

describe("CP18A client portal access", () => {
  it("allows immediate dashboard access for active unapproved operators", () => {
    expect(
      canAccessOperatorPortal({
        role: UserRole.BUILDING_REP,
        accountStatus: AccountStatus.ACTIVE,
        clientApprovalStatus: ClientApprovalStatus.AWAITING_SUBMISSION,
      }),
    ).toBe(true);
  });

  it("blocks rejected clients from operator portal shell", () => {
    expect(
      canAccessOperatorPortal({
        role: UserRole.BUILDING_REP,
        accountStatus: AccountStatus.REJECTED,
        clientApprovalStatus: ClientApprovalStatus.REJECTED,
      }),
    ).toBe(false);
  });

  it("allows unapproved clients to submit debt cases", () => {
    expect(
      canOperatorSubmitDebtCase({
        role: UserRole.BUILDING_REP,
        accountStatus: AccountStatus.ACTIVE,
        clientApprovalStatus: ClientApprovalStatus.AWAITING_SUBMISSION,
      }),
    ).toBe(true);
  });

  it("blocks rejected clients from submitting", () => {
    expect(
      canOperatorSubmitDebtCase({
        role: UserRole.MANAGEMENT_COMPANY,
        accountStatus: AccountStatus.REJECTED,
        clientApprovalStatus: ClientApprovalStatus.REJECTED,
      }),
    ).toBe(false);
  });

  it("treats legacy pending_approval as awaiting submission", () => {
    expect(
      resolveEffectiveClientApprovalStatus({
        role: UserRole.BUILDING_REP,
        accountStatus: AccountStatus.PENDING_APPROVAL,
        clientApprovalStatus: null,
      }),
    ).toBe(ClientApprovalStatus.AWAITING_SUBMISSION);
  });

  it("does not treat approved legacy active users as unapproved", () => {
    expect(
      isClientApproved({
        role: UserRole.BUILDING_REP,
        accountStatus: AccountStatus.ACTIVE,
        clientApprovalStatus: null,
      }),
    ).toBe(true);
  });

  it("limits unapproved active operators to their own debt cases in lists", () => {
    const filter = buildOperatorDebtCaseVisibilityFilter({
      id: "507f1f77bcf86cd799439011",
      email: "a@b.com",
      fullName: "A",
      role: UserRole.BUILDING_REP,
      accountStatus: AccountStatus.ACTIVE,
      clientApprovalStatus: ClientApprovalStatus.PENDING_LAWYER_APPROVAL,
    });
    expect(filter).toMatchObject({
      createdByUserId: expect.anything(),
    });
    expect(filter).not.toHaveProperty("workflowStatus", DebtCaseWorkflowStatus.DRAFT);
  });
});
