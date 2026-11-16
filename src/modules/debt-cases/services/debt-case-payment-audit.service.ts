import "server-only";

import type { ClientSession } from "mongoose";

import { writeAuditEventMandatory } from "@/modules/audit/services/audit-writer.service";
import type { AuthenticatedContext } from "@/shared/auth/get-authenticated-context";
import { buildUserAuditActor } from "@/shared/audit/build-audit-actor";
import { AuditEventType } from "@/shared/audit/domain/audit-event-taxonomy";
import { AuditOutcome } from "@/shared/audit/domain/audit-outcome";

export async function recordManualDebtCasePaymentLedgerEvent(
  input: {
    context: AuthenticatedContext;
    debtCaseId: string;
    buildingId: string;
    paymentEntryId: string;
    entryType: string;
    amountMinor: number;
    signedEffectMinor: number;
    correlationId?: string;
  },
  session: ClientSession,
): Promise<void> {
  const isReversal = input.entryType === "reversal" || input.entryType === "adjustment";
  await writeAuditEventMandatory(
    {
      eventType: isReversal ? AuditEventType.PAYMENT_ADJUSTED : AuditEventType.PAYMENT_RECORDED,
      actor: buildUserAuditActor(input.context),
      action: isReversal ? "debt_case_manual_payment_correction" : "debt_case_manual_payment_record",
      outcome: AuditOutcome.SUCCESS,
      target: { entityType: "debt_case_payment_entry", entityId: input.paymentEntryId },
      metadata: {
        debtCaseId: input.debtCaseId,
        buildingId: input.buildingId,
        entryType: input.entryType,
        amountMinor: input.amountMinor,
        signedEffectMinor: input.signedEffectMinor,
      },
      correlationId: input.correlationId,
    },
    { session },
  );
}

export async function recordDebtCaseDebtorResponseEvent(
  input: {
    context: AuthenticatedContext;
    debtCaseId: string;
    buildingId: string;
    debtorResponseId: string;
    responseType: string;
    correlationId?: string;
  },
  session: ClientSession,
): Promise<void> {
  await writeAuditEventMandatory(
    {
      eventType: AuditEventType.DEBT_CASE_DEBTOR_RESPONSE_RECORDED,
      actor: buildUserAuditActor(input.context),
      action: "debt_case_debtor_response_record",
      outcome: AuditOutcome.SUCCESS,
      target: { entityType: "debt_case_debtor_response", entityId: input.debtorResponseId },
      metadata: {
        debtCaseId: input.debtCaseId,
        buildingId: input.buildingId,
        responseType: input.responseType,
      },
      correlationId: input.correlationId,
    },
    { session },
  );
}

export async function recordDebtCaseResolutionEvent(
  input: {
    context: AuthenticatedContext;
    debtCaseId: string;
    buildingId: string;
    resolutionKind: string;
    correlationId?: string;
  },
  session: ClientSession,
): Promise<void> {
  await writeAuditEventMandatory(
    {
      eventType: AuditEventType.DEBT_CASE_RESOLUTION_RECORDED,
      actor: buildUserAuditActor(input.context),
      action: "debt_case_resolution",
      outcome: AuditOutcome.SUCCESS,
      target: { entityType: "debt_case", entityId: input.debtCaseId },
      metadata: {
        buildingId: input.buildingId,
        resolutionKind: input.resolutionKind,
      },
      correlationId: input.correlationId,
    },
    { session },
  );
}

export async function recordDebtCaseReopenedEvent(
  input: {
    context: AuthenticatedContext;
    debtCaseId: string;
    buildingId: string;
    correlationId?: string;
  },
  session: ClientSession,
): Promise<void> {
  await writeAuditEventMandatory(
    {
      eventType: AuditEventType.DEBT_CASE_REOPENED,
      actor: buildUserAuditActor(input.context),
      action: "debt_case_reopen_letter_sent",
      outcome: AuditOutcome.SUCCESS,
      target: { entityType: "debt_case", entityId: input.debtCaseId },
      metadata: { buildingId: input.buildingId },
      correlationId: input.correlationId,
    },
    { session },
  );
}