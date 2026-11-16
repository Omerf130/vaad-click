import mongoose from "mongoose";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { DebtCasePaymentStatus } from "@/modules/debt-cases/domain/debt-case-payment-status";
import { DebtCaseWorkflowStatus } from "@/modules/debt-cases/domain/debt-case-workflow-status";
import { DebtCase } from "@/modules/debt-cases/infra/debt-case.model";
import { DebtCaseManualPayment } from "@/modules/debt-cases/infra/debt-case-manual-payment.model";
import { recordDebtCaseManualPayment } from "@/modules/debt-cases/services/debt-case-manual-payment.service";
import { UserRole } from "@/modules/users/domain/user-role";
import { AccountStatus } from "@/modules/users/domain/account-status";
import { User } from "@/modules/users/infra/user.model";
import type { AuthenticatedContext } from "@/shared/auth/get-authenticated-context";
import { connectMongo } from "@/shared/db/connect";

const runIntegration = Boolean(
  process.env.MONGODB_URI && process.env.RUN_DEBT_CASE_INTEGRATION === "1",
);

describe.runIf(runIntegration)("manual payment idempotency (MongoDB)", () => {
  beforeAll(async () => {
    await connectMongo();
  });

  afterAll(async () => {
    await mongoose.disconnect();
  });

  it("returns the same payment entry for duplicate idempotency key", async () => {
    const debtCaseId = process.env.TEST_DEBT_CASE_POST_LETTER_ID;
    expect(debtCaseId).toBeTruthy();

    const lawyer = await User.findOne({
      role: UserRole.LAWYER_ADMIN,
      accountStatus: AccountStatus.ACTIVE,
    }).lean();
    expect(lawyer).toBeTruthy();

    const doc = await DebtCase.findOne({ debtCaseId }).lean();
    expect(doc?.workflowStatus).toBe(DebtCaseWorkflowStatus.LETTER_SENT);

    const context: AuthenticatedContext = {
      user: {
        id: lawyer!._id.toString(),
        email: lawyer!.email ?? "lawyer@test",
        role: UserRole.LAWYER_ADMIN,
        accountStatus: AccountStatus.ACTIVE,
      },
    } as AuthenticatedContext;

    const idempotencyKey = `test-${Date.now()}`;
    const paymentDate = new Date();

    const first = await recordDebtCaseManualPayment({
      context,
      debtCaseId: debtCaseId!,
      amountMinor: 100,
      paymentDate,
      idempotencyKey,
    });
    const second = await recordDebtCaseManualPayment({
      context,
      debtCaseId: debtCaseId!,
      amountMinor: 100,
      paymentDate,
      idempotencyKey,
    });

    expect(second.idempotentReplay).toBe(true);
    expect(second.paymentEntryId).toBe(first.paymentEntryId);

    const count = await DebtCaseManualPayment.countDocuments({ debtCaseId, idempotencyKey });
    expect(count).toBe(1);

    const refreshed = await DebtCase.findOne({ debtCaseId }).lean();
    expect(refreshed?.paymentStatus).not.toBe(DebtCasePaymentStatus.NONE);
  });
});