"use client";

import { useActionState, useId, useMemo } from "react";

import { Button } from "@/components/ui/Button/Button";
import { DebtCaseWorkflowStatus } from "@/modules/debt-cases/domain/debt-case-workflow-status";
import { DebtCaseWorkflowStatusBadge } from "@/modules/debt-cases/ui/DebtCaseStatusBadges";
import type { AdminDocumentAssetListItem } from "@/modules/document-assets/presentation/document-asset-view.types";
import { formatDocumentClassificationHe } from "@/modules/document-assets/presentation/document-messages.he";
import {
  confirmWarningLetterDeliveryFormAction,
  finalizeWarningLetterFormAction,
  recordManualWarningLetterDeliveryFormAction,
  type WarningLetterLifecycleActionState,
} from "@/modules/warning-letters/actions/lawyer-warning-letter-lifecycle.actions";
import {
  formatWarningLetterDeliveryChannelHe,
  WARNING_LETTER_MANUAL_DELIVERY_CHANNELS,
  WarningLetterDeliveryChannel,
} from "@/modules/warning-letters/domain/warning-letter-delivery-channel";
import { WarningLetterDeliveryRecordStatus } from "@/modules/warning-letters/domain/warning-letter-delivery-record-status";
import type { WarningLetterDeliveryRecordView } from "@/modules/warning-letters/services/warning-letter-delivery.service";
import type { WarningLetterFinalDocumentView } from "@/modules/warning-letters/services/warning-letter-finalization.service";
import type { WarningLetterLegalReadinessChecklist } from "@/modules/warning-letters/services/warning-letter-legal-readiness-checklist.service";
import type { WarningLetterPostLetterTrackingView } from "@/modules/warning-letters/services/warning-letter-post-letter-tracking.service";
import { WarningLetterFinalPdfDownload } from "@/modules/warning-letters/ui/WarningLetterFinalPdfDownload";
import styles from "@/modules/warning-letters/ui/WarningLetterPreviewPanel.module.scss";

type Props = {
  debtCaseId: string;
  buildingId: string;
  draftId: string | null;
  checklist: WarningLetterLegalReadinessChecklist;
  finalDocument: WarningLetterFinalDocumentView | null;
  deliveryRecords: WarningLetterDeliveryRecordView[];
  debtorDisplayName: string;
  postLetterTracking?: WarningLetterPostLetterTrackingView | null;
  caseDocumentAssets?: AdminDocumentAssetListItem[];
  workflowStatus: string;
  letterSentAtIso: string | null;
  embedded?: boolean;
};

const initialState: WarningLetterLifecycleActionState = { ok: false };

function defaultLocalDatetimeValue(): string {
  const d = new Date();
  d.setSeconds(0, 0);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function WarningLetterLifecyclePanel({
  debtCaseId,
  buildingId,
  draftId,
  checklist,
  finalDocument,
  deliveryRecords,
  debtorDisplayName,
  postLetterTracking = null,
  caseDocumentAssets = [],
  workflowStatus,
  letterSentAtIso,
  embedded = false,
}: Props) {
  const idempotencyKey = useMemo(() => crypto.randomUUID(), []);
  const sentAtDefault = useMemo(() => defaultLocalDatetimeValue(), []);
  const confirmAtDefault = useMemo(() => defaultLocalDatetimeValue(), []);
  const formIdPrefix = useId();

  const [finalizeState, dispatchFinalize, finalizePending] = useActionState(
    finalizeWarningLetterFormAction,
    initialState,
  );
  const [deliveryState, dispatchDelivery, deliveryPending] = useActionState(
    recordManualWarningLetterDeliveryFormAction,
    initialState,
  );
  const [confirmState, dispatchConfirm, confirmPending] = useActionState(
    confirmWarningLetterDeliveryFormAction,
    initialState,
  );

  const Wrapper = embedded ? "div" : "section";
  const wrapperProps = embedded
    ? { className: styles.lifecycleEmbedded }
    : {
        className: styles.section,
        "aria-labelledby": "wl-lifecycle-title" as const,
      };

  const canRecordDelivery = checklist.manualDeliveryAllowed && Boolean(finalDocument?.pdfAvailable);

  return (
    <Wrapper {...wrapperProps}>
      <h3 id={embedded ? undefined : "wl-lifecycle-title"} className={styles.sectionTitle}>
        סגירה ומשלוח ידני
      </h3>
      <p className={styles.metaLine}>
        תיעוד משלוח בלבד — אין שליחה אוטומטית. סטטוס «נשלח» מתעדכן רק כשעורך הדין מדווח במפורש.
      </p>

      <p className={styles.metaLine}>
        סטטוס תיק: <DebtCaseWorkflowStatusBadge status={workflowStatus as never} />
        {letterSentAtIso ? ` · נשלח (תיעוד) ${new Date(letterSentAtIso).toLocaleString("he-IL")}` : null}
      </p>

      {postLetterTracking?.lawyerReminderHe ? (
        <p className={styles.incompleteWarning} role="status">
          {postLetterTracking.lawyerReminderHe}
        </p>
      ) : null}

      {postLetterTracking?.printedDeadlineDateIso ? (
        <p className={styles.metaLine}>
          מועד אחרון מודפס: {postLetterTracking.printedDeadlineDateIso}
          {postLetterTracking.pastPrintedDeadline
            ? ` · עברו ${postLetterTracking.daysPastPrintedDeadline ?? "?"} ימים`
            : null}
        </p>
      ) : null}

      {[finalizeState, deliveryState, confirmState].map(
        (state, index) =>
          state.message ? (
            <p
              key={index}
              className={state.ok ? styles.bannerSuccess : styles.incompleteWarning}
              role="status"
            >
              {state.message}
            </p>
          ) : null,
      )}

      {finalDocument ? (
        <>
          <p className={styles.metaLine}>
            רישום סגירה: {finalDocument.finalDocumentId.slice(0, 8)}… · גרסת טיוטה{" "}
            {finalDocument.draftRevision} · {finalDocument.status}
          </p>
          <p className={styles.metaLine}>
            תאריך סגירה: {new Date(finalDocument.finalizedAtIso).toLocaleString("he-IL")}
            {finalDocument.letterDateIso ? ` · תאריך מכתב: ${finalDocument.letterDateIso}` : null}
          </p>
          {finalDocument.pdfAvailable ? (
            <WarningLetterFinalPdfDownload
              debtCaseId={debtCaseId}
              finalDocumentId={finalDocument.finalDocumentId}
              draftRevision={finalDocument.draftRevision}
              archivalNoteHe={finalDocument.pdfArchivalNoteHe}
            />
          ) : (
            <p className={styles.incompleteWarning}>
              PDF סופי אינו זמין — לא ניתן לתעד משלוח מבצעי.
            </p>
          )}
        </>
      ) : (
        <form action={dispatchFinalize} className={styles.inlineForm}>
          <input type="hidden" name="debtCaseId" value={debtCaseId} />
          <input type="hidden" name="buildingId" value={buildingId} />
          <input type="hidden" name="draftId" value={draftId ?? ""} />
          <Button
            type="submit"
            variant="primary"
            size="sm"
            disabled={!checklist.finalizationAllowed || !draftId || finalizePending}
          >
            סגירת מסמך סופי (מבוקר)
          </Button>
          {!checklist.finalizationAllowed ? (
            <p className={styles.incompleteWarning}>
              סגירה חסומה — יש להשלים את רשימת המוכנות המשפטית.
            </p>
          ) : null}
        </form>
      )}

      {finalDocument?.operativeBlockReasonsHe.length ? (
        <ul className={styles.metaList}>
          {finalDocument.operativeBlockReasonsHe.map((reason) => (
            <li key={reason}>{reason}</li>
          ))}
        </ul>
      ) : null}

      <h4 className={styles.subsectionTitle}>תיעוד משלוח ידני</h4>
      {!canRecordDelivery ? (
        <p className={styles.incompleteWarning}>
          תיעוד משלוח חסום — נדרש מסמך סופי עם PDF זמין ואישור תיק להכנת מכתב.
        </p>
      ) : (
        <form action={dispatchDelivery} className={styles.deliveryForm}>
          <input type="hidden" name="debtCaseId" value={debtCaseId} />
          <input type="hidden" name="finalDocumentId" value={finalDocument?.finalDocumentId ?? ""} />
          <input type="hidden" name="idempotencyKey" value={idempotencyKey} />
          <label>
            ערוץ משלוח
            <select name="channel" defaultValue={WarningLetterDeliveryChannel.WHATSAPP_MANUAL}>
              {WARNING_LETTER_MANUAL_DELIVERY_CHANNELS.map((channel) => (
                <option key={channel} value={channel}>
                  {formatWarningLetterDeliveryChannelHe(channel)}
                </option>
              ))}
            </select>
          </label>
          <label>
            סטטוס תיעוד
            <select name="deliveryStatus" defaultValue={WarningLetterDeliveryRecordStatus.SENT}>
              <option value={WarningLetterDeliveryRecordStatus.ATTEMPTED}>ניסיון משלוח</option>
              <option value={WarningLetterDeliveryRecordStatus.SENT}>
                נשלח (מעבר לסטטוס תיק «מכתב נשלח»)
              </option>
              <option value={WarningLetterDeliveryRecordStatus.FAILED}>נכשל</option>
            </select>
          </label>
          <label>
            מועד שליחה בפועל
            <input
              type="datetime-local"
              name="sentAtIsoLocal"
              defaultValue={sentAtDefault}
              required
            />
          </label>
          <label>
            נמען
            <input name="recipientDisplayName" defaultValue={debtorDisplayName} required />
          </label>
          <label>
            פרטי קשר (תיעוד)
            <input name="recipientContactHint" placeholder="טלפון / כתובת — לתיעוד בלבד" />
          </label>
          <label>
            מספר מעקב / אסמכתא
            <input name="trackingReference" />
          </label>
          <label>
            הערות פנימיות
            <textarea name="internalNotes" rows={2} />
          </label>
          {caseDocumentAssets.length > 0 ? (
            <label>
              מסמך הוכחה (אופציונלי)
              <select name="evidenceDocumentAssetId" defaultValue="">
                <option value="">ללא קובץ מצורף</option>
                {caseDocumentAssets.map((doc) => (
                  <option key={doc.documentAssetId} value={doc.documentAssetId}>
                    {formatDocumentClassificationHe(doc.classification)} · {doc.documentAssetId.slice(0, 8)}…
                  </option>
                ))}
              </select>
            </label>
          ) : (
            <p className={styles.metaLine}>אין מסמכי תיק — ניתן לצרף הערה בלבד.</p>
          )}
          <Button type="submit" variant="secondary" size="sm" disabled={deliveryPending}>
            שמירת תיעוד משלוח
          </Button>
        </form>
      )}

      {deliveryRecords.length > 0 ? (
        <ul className={styles.metaList}>
          {deliveryRecords.map((record) => {
            const canConfirm =
              record.status === WarningLetterDeliveryRecordStatus.SENT ||
              record.status === WarningLetterDeliveryRecordStatus.ATTEMPTED ||
              record.status === WarningLetterDeliveryRecordStatus.ATTEMPT_RECORDED;
            const formId = `${formIdPrefix}-${record.deliveryRecordId}`;
            return (
              <li key={record.deliveryRecordId}>
                <p className={styles.metaLine}>
                  {formatWarningLetterDeliveryChannelHe(record.channel)} · {record.statusHe} ·{" "}
                  {record.recipientDisplayName}
                  {record.sentAtIso
                    ? ` · ${new Date(record.sentAtIso).toLocaleString("he-IL")}`
                    : null}
                </p>
                {record.trackingReference ? (
                  <p className={styles.metaLine}>אסמכתא: {record.trackingReference}</p>
                ) : null}
                {record.internalNotes ? (
                  <p className={styles.metaLine}>הערות: {record.internalNotes}</p>
                ) : null}
                {record.confirmedDeliveredAtIso ? (
                  <p className={styles.bannerSuccess}>
                    אושרה קבלה: {new Date(record.confirmedDeliveredAtIso).toLocaleString("he-IL")}
                  </p>
                ) : canConfirm ? (
                  <form id={formId} action={dispatchConfirm} className={styles.deliveryForm}>
                    <input type="hidden" name="debtCaseId" value={debtCaseId} />
                    <input type="hidden" name="deliveryRecordId" value={record.deliveryRecordId} />
                    <label>
                      מועד אישור קבלה
                      <input
                        type="datetime-local"
                        name="confirmedDeliveredAtIsoLocal"
                        defaultValue={confirmAtDefault}
                        required
                      />
                    </label>
                    <label>
                      הערה פנימית (אופציונלי)
                      <textarea name="internalNotes" rows={2} />
                    </label>
                    <Button type="submit" variant="secondary" size="sm" disabled={confirmPending}>
                      תיעוד אישור קבלה
                    </Button>
                  </form>
                ) : null}
              </li>
            );
          })}
        </ul>
      ) : null}

      {workflowStatus === DebtCaseWorkflowStatus.LETTER_SENT ? (
        <p className={styles.bannerSuccess} role="status">
          התיק במצב מכתב נשלח — המשך טיפול (תביעה, תשלום) ידני בלבד.
        </p>
      ) : null}
    </Wrapper>
  );
}