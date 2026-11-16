import "server-only";

import { randomUUID } from "node:crypto";

import { Types } from "mongoose";

import {
  WARNING_LETTER_OPERATIVE_DEADLINE_POLICY_ID,
  WARNING_LETTER_OPERATIVE_DEADLINE_POLICY_SUMMARY_HE,
} from "@/modules/warning-letters/domain/warning-letter-operative-deadline-policy";
import { WarningLetterOperativeDeadlinePolicyConfirmation } from "@/modules/warning-letters/infra/warning-letter-operative-deadline-policy-confirmation.model";
import { UserRole } from "@/modules/users/domain/user-role";
import type { AuthenticatedContext } from "@/shared/auth/get-authenticated-context";
import { connectMongo } from "@/shared/db/connect";

export type OperativeDeadlinePolicyConfirmationView = {
  policyId: string;
  policySummaryHe: string;
  confirmedAtIso: string;
  confirmedByUserId: string;
};

export async function loadOperativeDeadlinePolicyConfirmation(): Promise<OperativeDeadlinePolicyConfirmationView | null> {
  await connectMongo();
  const doc = await WarningLetterOperativeDeadlinePolicyConfirmation.findOne({
    policyId: WARNING_LETTER_OPERATIVE_DEADLINE_POLICY_ID,
  }).lean();
  if (!doc) {
    return null;
  }
  return {
    policyId: doc.policyId,
    policySummaryHe: doc.policySummaryHe,
    confirmedAtIso: doc.confirmedAt.toISOString(),
    confirmedByUserId: String(doc.confirmedByUserId),
  };
}

export async function isOperativeDeadlinePolicyConfirmed(): Promise<boolean> {
  const row = await loadOperativeDeadlinePolicyConfirmation();
  return row != null;
}

export async function confirmOperativeDeadlinePolicyForLawyerAdmin(input: {
  context: AuthenticatedContext;
}): Promise<{ alreadyConfirmed: boolean; confirmation: OperativeDeadlinePolicyConfirmationView }> {
  if (input.context.user.role !== UserRole.LAWYER_ADMIN) {
    throw new Error("Lawyer admin only");
  }
  await connectMongo();
  const existing = await loadOperativeDeadlinePolicyConfirmation();
  if (existing) {
    return { alreadyConfirmed: true, confirmation: existing };
  }

  const confirmedAt = new Date();
  const confirmationId = randomUUID();

  await WarningLetterOperativeDeadlinePolicyConfirmation.create({
    confirmationId,
    policyId: WARNING_LETTER_OPERATIVE_DEADLINE_POLICY_ID,
    policySummaryHe: WARNING_LETTER_OPERATIVE_DEADLINE_POLICY_SUMMARY_HE,
    confirmedByUserId: new Types.ObjectId(input.context.user.id),
    confirmedAt,
  });

  return {
    alreadyConfirmed: false,
    confirmation: {
      policyId: WARNING_LETTER_OPERATIVE_DEADLINE_POLICY_ID,
      policySummaryHe: WARNING_LETTER_OPERATIVE_DEADLINE_POLICY_SUMMARY_HE,
      confirmedAtIso: confirmedAt.toISOString(),
      confirmedByUserId: input.context.user.id,
    },
  };
}