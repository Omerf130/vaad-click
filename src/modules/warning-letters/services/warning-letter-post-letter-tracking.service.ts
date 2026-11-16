import "server-only";

import { DebtCaseWorkflowStatus } from "@/modules/debt-cases/domain/debt-case-workflow-status";
import type { DebtCaseRecord } from "@/modules/debt-cases/domain/debt-case-record.types";
import { WarningLetterFinalDocument } from "@/modules/warning-letters/infra/warning-letter-final-document.model";
import type { WarningLetterDeliveryRecordView } from "@/modules/warning-letters/services/warning-letter-delivery.service";
import type { WarningLetterFinalDocumentView } from "@/modules/warning-letters/services/warning-letter-finalization.service";
import type { WarningLetterContentSnapshot } from "@/modules/warning-letters/snapshot/warning-letter-snapshot.types";
import { startOfDayJerusalem, todayJerusalemIso } from "@/shared/time/jerusalem-calendar";
import { connectMongo } from "@/shared/db/connect";

export type WarningLetterPostLetterTrackingView = {
  printedDeadlineDateIso: string | null;
  pastPrintedDeadline: boolean;
  daysPastPrintedDeadline: number | null;
  letterSentAtIso: string | null;
  latestDeliveryStatusHe: string | null;
  deliveryRecordCount: number;
  lawyerReminderHe: string | null;
};

function daysBetweenJerusalemDates(fromIso: string, toIso: string): number {
  const from = startOfDayJerusalem(fromIso).getTime();
  const to = startOfDayJerusalem(toIso).getTime();
  return Math.round((to - from) / (24 * 60 * 60 * 1000));
}

export async function loadPrintedDeadlineIsoForPortalDebtCase(
  debtCaseId: string,
): Promise<string | null> {
  await connectMongo();
  const doc = await WarningLetterFinalDocument.findOne({ debtCaseId })
    .sort({ finalizedAt: -1 })
    .select("contentSnapshot")
    .lean();
  if (!doc?.contentSnapshot) {
    return null;
  }
  const snapshot = doc.contentSnapshot as WarningLetterContentSnapshot;
  return snapshot.printedDeadlineDateIso ?? null;
}

export function buildWarningLetterPostLetterTrackingView(input: {
  record: DebtCaseRecord;
  finalDocument: WarningLetterFinalDocumentView | null;
  deliveryRecords: WarningLetterDeliveryRecordView[];
}): WarningLetterPostLetterTrackingView {
  const deadlineIso = input.finalDocument?.printedDeadlineDateIso ?? null;
  const todayIso = todayJerusalemIso();
  const pastPrintedDeadline = Boolean(
    deadlineIso && startOfDayJerusalem(todayIso).getTime() > startOfDayJerusalem(deadlineIso).getTime(),
  );
  const daysPastPrintedDeadline =
    pastPrintedDeadline && deadlineIso ? daysBetweenJerusalemDates(deadlineIso, todayIso) : null;

  const latest = input.deliveryRecords[0] ?? null;
  const letterSentAtIso = input.record.letterSentAtIso;

  let lawyerReminderHe: string | null = null;
  if (input.record.workflowStatus === DebtCaseWorkflowStatus.LETTER_SENT && pastPrintedDeadline) {
    lawyerReminderHe = `חלף המועד המודפס (${deadlineIso}) — יש לעקוב אחר תגובת החייב ולתעד פעולות המשך ידנית.`;
  } else if (
    input.finalDocument &&
    !letterSentAtIso &&
    input.record.workflowStatus === DebtCaseWorkflowStatus.AWAITING_LAWYER_REVIEW
  ) {
    lawyerReminderHe =
      "מסמך סופי קיים — תיעוד משלוח ידני נדרש לפני מעבר לסטטוס «מכתב נשלח».";
  }

  return {
    printedDeadlineDateIso: deadlineIso,
    pastPrintedDeadline,
    daysPastPrintedDeadline,
    letterSentAtIso,
    latestDeliveryStatusHe: latest?.statusHe ?? null,
    deliveryRecordCount: input.deliveryRecords.length,
    lawyerReminderHe,
  };
}