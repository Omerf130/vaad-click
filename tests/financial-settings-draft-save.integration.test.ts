import mongoose, { Types } from "mongoose";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { FinancialSettingsVersionStatus } from "@/modules/financial-settings/domain/financial-settings-version-status";
import { FinancialSettingsVersion } from "@/modules/financial-settings/infra/financial-settings-version.model";
import { mapDraftFormToContentInput } from "@/modules/financial-settings/validation/financial-settings-form.schema";
import { updateFinancialSettingsDraft } from "@/modules/financial-settings/services/financial-settings-draft.service";
import { AccountStatus } from "@/modules/users/domain/account-status";
import { UserRole } from "@/modules/users/domain/user-role";
import { User } from "@/modules/users/infra/user.model";
import type { AuthenticatedContext } from "@/shared/auth/get-authenticated-context";
import { connectMongo } from "@/shared/db/connect";
import { CurrencyCode } from "@/shared/financial/currency";

const uri = process.env.MONGODB_URI;
const runIntegration = Boolean(uri && process.env.RUN_FINANCIAL_SETTINGS_INTEGRATION === "1");

describe.runIf(runIntegration)("financial settings draft save integration", () => {
  let settingsVersionId: string;
  let context: AuthenticatedContext;

  beforeAll(async () => {
    await connectMongo();
    const lawyer = await User.findOne({
      role: UserRole.LAWYER_ADMIN,
      accountStatus: AccountStatus.ACTIVE,
    }).lean();
    expect(lawyer).toBeTruthy();
    context = {
      user: {
        id: lawyer!._id.toString(),
        email: lawyer!.email ?? "lawyer@test",
        fullName: lawyer!.fullName ?? "Lawyer",
        role: UserRole.LAWYER_ADMIN,
        accountStatus: AccountStatus.ACTIVE,
      },
      session: {} as AuthenticatedContext["session"],
    };

    settingsVersionId = crypto.randomUUID();
    await FinancialSettingsVersion.create({
      settingsVersionId,
      status: FinancialSettingsVersionStatus.DRAFT,
      createdByUserId: new Types.ObjectId(context.user.id),
      revision: 1,
      currency: CurrencyCode.ILS,
      amounts: {},
      vatSchedule: [],
      escalation: {
        calculationBase: "unspecified",
        courtCostsPolicy: "unspecified",
      },
    });
  });

  afterAll(async () => {
    if (settingsVersionId) {
      await FinancialSettingsVersion.deleteOne({
        settingsVersionId,
        status: FinancialSettingsVersionStatus.DRAFT,
      });
    }
    await mongoose.disconnect();
  });

  it("persists gross-inclusive draft content through updateFinancialSettingsDraft", async () => {
    const mapped = mapDraftFormToContentInput({
      fields: {
        revision: 1,
        debtorTreatmentFeeShekels: "327.06",
        committeeAssumedTreatmentFeeShekels: "150",
        trustAccountProcessingFeePercent: "2.3",
        committeeTransferFeePercent: "0.5",
        escalationPercent: "20",
      },
      vatRows: [{ effectiveFromIso: "2026-10-14", ratePercent: "18" }],
    });
    expect(mapped.ok).toBe(true);
    if (!mapped.ok) {
      throw new Error(JSON.stringify(mapped.fieldErrors));
    }

    const updated = await updateFinancialSettingsDraft({
      context,
      revision: 1,
      content: mapped.content,
    });

    expect(updated?.revision).toBe(2);
    expect(updated?.amountsMonetaryBasis).toBe("gross_inclusive_vat");
    expect(updated?.amounts?.debtorTreatmentFeeGross?.amountMinor).toBe(32706);
  });
});
