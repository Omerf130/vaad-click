import mongoose from "mongoose";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { DebtCaseLawyerReviewStatus } from "@/modules/debt-cases/domain/debt-case-lawyer-review-status";
import { WarningLetterDraftStatus } from "@/modules/warning-letters/domain/warning-letter-draft-status";
import { WarningLetterDraft } from "@/modules/warning-letters/infra/warning-letter-draft.model";
import { maybeInvalidateWarningLetterDraftOnDebtCaseChange } from "@/modules/warning-letters/services/warning-letter-draft-invalidation.service";
import {
  loadPersistedWarningLetterDraftForDebtCase,
  syncInitialWarningLetterDraftForApprovedCase,
} from "@/modules/warning-letters/services/warning-letter-draft.service";
import { AccountStatus } from "@/modules/users/domain/account-status";
import { UserRole } from "@/modules/users/domain/user-role";
import type { AuthenticatedContext } from "@/shared/auth/get-authenticated-context";
import { connectMongo } from "@/shared/db/connect";

const runIntegration = Boolean(
  process.env.MONGODB_URI && process.env.RUN_WARNING_LETTER_DRAFT_INTEGRATION === "1",
);

describe.runIf(runIntegration)("warning letter draft lifecycle (MongoDB)", () => {
  beforeAll(async () => {
    await connectMongo();
  });

  afterAll(async () => {
    await mongoose.disconnect();
  });

  it("reapproval after principal change creates revision 2 with same reference", async () => {
    const debtCaseId = process.env.TEST_WARNING_LETTER_DEBT_CASE_ID;
    expect(debtCaseId).toBeTruthy();

    const lawyer = {
      user: {
        id: process.env.TEST_LAWYER_ADMIN_USER_ID ?? "aaaaaaaaaaaaaaaaaaaaaaaa",
        email: "lawyer-integration@test.com",
        role: UserRole.LAWYER_ADMIN,
        accountStatus: AccountStatus.ACTIVE,
      },
    } as AuthenticatedContext;

    const { getDebtCase } = await import("@/modules/debt-cases/services/debt-case.service");
    const record = await getDebtCase({ context: lawyer, debtCaseId: debtCaseId! });
    expect(record.lawyerReviewStatus).toBe(DebtCaseLawyerReviewStatus.APPROVED_FOR_LETTER_PREP);

    await WarningLetterDraft.deleteMany({ debtCaseId });

    const first = await syncInitialWarningLetterDraftForApprovedCase({
      context: lawyer,
      debtCaseId: debtCaseId!,
      debtCaseRecord: { ...record, principalAmountMinor: 120_000 },
    });
    expect(first.draftRevision).toBe(1);

    const rev1 = await WarningLetterDraft.findOne({ debtCaseId, draftRevision: 1 }).lean();
    expect(rev1?.status).toBe(WarningLetterDraftStatus.ACTIVE);
    expect(rev1?.contentSnapshot.principalAmountMinor).toBe(120_000);

    const session = await mongoose.startSession();
    await session.withTransaction(async () => {
      await maybeInvalidateWarningLetterDraftOnDebtCaseChange({
        context: lawyer,
        debtCase: { ...record, principalAmountMinor: 140_000 },
        session,
      });
    });
    await session.endSession();

    const rev1After = await WarningLetterDraft.findOne({ draftId: rev1!.draftId }).lean();
    expect(rev1After?.status).toBe(WarningLetterDraftStatus.INVALIDATED);

    const second = await syncInitialWarningLetterDraftForApprovedCase({
      context: lawyer,
      debtCaseId: debtCaseId!,
      debtCaseRecord: { ...record, principalAmountMinor: 140_000 },
    });
    expect(second.draftRevision).toBe(2);
    expect(second.created).toBe(true);

    const rev2 = await WarningLetterDraft.findOne({ debtCaseId, draftRevision: 2 }).lean();
    expect(rev2?.status).toBe(WarningLetterDraftStatus.ACTIVE);
    expect(rev2?.letterCaseReference).toBe(rev1?.letterCaseReference);
    expect(rev2?.contentSnapshot.principalAmountMinor).toBe(140_000);

    const activeCount = await WarningLetterDraft.countDocuments({
      debtCaseId,
      status: WarningLetterDraftStatus.ACTIVE,
    });
    expect(activeCount).toBe(1);

    const view = await loadPersistedWarningLetterDraftForDebtCase({
      context: lawyer,
      debtCaseId: debtCaseId!,
    });
    expect(view.draftRevision).toBe(2);
    expect(view.snapshot.principalAmountMinor).toBe(140_000);
  });
});
