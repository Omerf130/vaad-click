"use client";

import { useActionState, useId, useMemo } from "react";

import { Button } from "@/components/ui/Button/Button";
import { DebtCaseWorkflowStatus } from "@/modules/debt-cases/domain/debt-case-workflow-status";
import {
  recordDebtCaseDebtorResponseFormAction,
  recordDebtCaseManualPaymentFormAction,
  reopenDebtCasePostLetterFormAction,
  resolveDebtCasePostLetterFormAction,
  reverseDebtCaseManualPaymentFormAction,
} from "@/modules/debt-cases/actions/admin-debt-case-post-letter.actions";
import { DebtCaseDebtorResponseType } from "@/modules/debt-cases/domain/debt-case-debtor-response-type";
import { DebtCaseManualPaymentEntryType } from "@/modules/debt-cases/domain/debt-case-manual-payment-entry-type";
import { DebtCaseManualPaymentMethod } from "@/modules/debt-cases/domain/debt-case-manual-payment-method";
import {
  DebtCaseResolutionKind,
  formatDebtCaseResolutionKindHe,
} from "@/modules/debt-cases/domain/debt-case-resolution-kind";
import type { DebtCaseRecord } from "@/modules/debt-cases/domain/debt-case-record.types";
import {
  formatDebtCaseDebtorResponseTypeHe,
} from "@/modules/debt-cases/domain/debt-case-debtor-response-type";
import { formatDebtCaseManualPaymentMethodHe } from "@/modules/debt-cases/domain/debt-case-manual-payment-method";
import { formatDebtCaseInstantHe, formatMinorUnitsToNisDisplay } from "@/modules/debt-cases/presentation/debt-case-labels.he";
import { formatDebtCasePaymentStatusHe } from "@/modules/debt-cases/presentation/debt-case-payment-status.he";
import type { AdminDebtCasePostLetterActionState } from "@/modules/debt-cases/presentation/admin-debt-case-post-letter-action-state";
import type { DebtCasePostLetterFinanceBundle } from "@/modules/debt-cases/services/debt-case-post-letter-finance.service";
import type { AdminDocumentAssetListItem } from "@/modules/document-assets/presentation/document-asset-view.types";
import { formatDocumentClassificationHe } from "@/modules/document-assets/presentation/document-messages.he";
import styles from "@/modules/warning-letters/ui/WarningLetterPreviewPanel.module.scss";

type Props = {
  record: DebtCaseRecord;
  bundle: DebtCasePostLetterFinanceBundle;
  caseDocumentAssets?: AdminDocumentAssetListItem[];
  embedded?: boolean;
};

const initialState: AdminDebtCasePostLetterActionState = { ok: false, message: "" };

function defaultLocalDatetimeValue(): string {
  const d = new Date();
  d.setSeconds(0, 0);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function DebtCasePostLetterFinancePanel({
  record,
  bundle,
  caseDocumentAssets = [],
  embedded = false,
}: Props) {
  const formPrefix = useId();
  const paymentIdempotency = useMemo(() => crypto.randomUUID(), []);
  const responseIdempotency = useMemo(() => crypto.randomUUID(), []);
  const paymentDateDefault = useMemo(() => defaultLocalDatetimeValue(), []);

  const [paymentState, dispatchPayment, paymentPending] = useActionState(
    recordDebtCaseManualPaymentFormAction,
    initialState,
  );
  const [reverseState, dispatchReverse, reversePending] = useActionState(
    reverseDebtCaseManualPaymentFormAction,
    initialState,
  );
  const [responseState, dispatchResponse, responsePending] = useActionState(
    recordDebtCaseDebtorResponseFormAction,
    initialState,
  );
  const [resolveState, dispatchResolve, resolvePending] = useActionState(
    resolveDebtCasePostLetterFormAction,
    initialState,
  );
  const [reopenState, dispatchReopen, reopenPending] = useActionState(
    reopenDebtCasePostLetterFormAction,
    initialState,
  );

  const canMutate =
    record.workflowStatus === DebtCaseWorkflowStatus.LETTER_SENT;
  const isClosed = record.workflowStatus === DebtCaseWorkflowStatus.CLOSED_MANUAL;

  const reversiblePayments = bundle.payments.filter(
    (row) =>
      row.entryType === DebtCaseManualPaymentEntryType.PAYMENT &&
      !bundle.payments.some(
        (other) =>
          other.entryType === DebtCaseManualPaymentEntryType.REVERSAL &&
          other.reversesPaymentEntryId === row.paymentEntryId,
      ),
  );

  const Wrapper = embedded ? "div" : "section";

  return (
    <Wrapper className={styles.previewSection} aria-labelledby={`${formPrefix}-finance-title`}>
      <h3 id={`${formPrefix}-finance-title`} className={styles.previewTitle}>
        תיעוד תשלומים ומעקב לאחר מכתב
      </h3>
      <p className={styles.metaLine}>
        סכום במכתב המסופק (קפוא): <strong>{bundle.letterTotalDueDisplay} ₪</strong> · יתרה לפי
        תיעוד: <strong>{formatMinorUnitsToNisDisplay(bundle.outstandingBalanceMinor)} ₪</strong> ·
        סטטוס דיווח: {formatDebtCasePaymentStatusHe(record.paymentStatus)}
      </p>
      {bundle.overpaymentMinor > 0 ? (
        <p className={styles.incompleteWarning} role="status">
          חריגה מסכום המכתב בתיעוד: {formatMinorUnitsToNisDisplay(bundle.overpaymentMinor)} ₪ (מותר
          רק בתיעוד מפורש).
        </p>
      ) : null}
      {bundle.hasDisputedResponse ? (
        <p className={styles.incompleteWarning} role="status">
          תועדה הכחשת חוב — לא נסגר אוטומטית ולא ייפתחו הליכים אוטומטיים.
        </p>
      ) : null}

      <p className={styles.metaLine}>
        סה״כ תשלומים מתועדים: {formatMinorUnitsToNisDisplay(bundle.netReportedPaymentsMinor)} ₪ · קרן
        בתיק (נוכחי): {formatMinorUnitsToNisDisplay(bundle.casePrincipalMinor)} ₪
      </p>

      {canMutate ? (
        <form action={dispatchPayment} className={styles.deliveryForm}>
          <input type="hidden" name="debtCaseId" value={record.debtCaseId} />
          <input type="hidden" name="idempotencyKey" value={paymentIdempotency} />
          <h4 className={styles.previewTitle}>הוספת תשלום ידני</h4>
          <label>
            סכום (₪)
            <input name="amountNis" type="text" inputMode="decimal" required autoComplete="off" />
          </label>
          <label>
            תאריך תשלום
            <input
              name="paymentDate"
              type="datetime-local"
              required
              defaultValue={paymentDateDefault}
            />
          </label>
          <label>
            אמצעי תשלום
            <select name="paymentMethod" defaultValue="">
              <option value="">—</option>
              {Object.values(DebtCaseManualPaymentMethod).map((method) => (
                <option key={method} value={method}>
                  {formatDebtCaseManualPaymentMethodHe(method)}
                </option>
              ))}
            </select>
          </label>
          <label>
            אסמכתא
            <input name="reference" type="text" maxLength={200} />
          </label>
          <label>
            הערות עורך דין (סודי)
            <textarea name="lawyerNotes" rows={2} maxLength={2000} />
          </label>
          {caseDocumentAssets.length > 0 ? (
            <label>
              מסמך ראיה (אופציונלי)
              <select name="evidenceDocumentAssetId" defaultValue="">
                <option value="">—</option>
                {caseDocumentAssets.map((doc) => (
                  <option key={doc.documentAssetId} value={doc.documentAssetId}>
                    {formatDocumentClassificationHe(doc.classification)} ·{" "}
                    {doc.documentAssetId.slice(0, 8)}…
                  </option>
                ))}
              </select>
            </label>
          ) : null}
          <label className={styles.checkboxRow}>
            <input name="acceptOverpaymentAcknowledged" type="checkbox" />
            מאשר תיעוד מעל יתרת המכתב (חריגה מפורשת)
          </label>
          <Button type="submit" disabled={paymentPending}>
            {paymentPending ? "שומר…" : "תיעוד תשלום"}
          </Button>
          {paymentState.message ? (
            <p
              className={paymentState.ok ? styles.metaLine : styles.errorBanner}
              role="status"
            >
              {paymentState.message}
            </p>
          ) : null}
        </form>
      ) : null}

      {bundle.payments.length > 0 ? (
        <div>
          <h4 className={styles.previewTitle}>היסטוריית תשלומים</h4>
          <ul className={styles.metaList}>
            {bundle.payments.map((row) => (
              <li key={row.paymentEntryId}>
                <span>
                  {row.entryType === DebtCaseManualPaymentEntryType.REVERSAL ? "ביטול · " : ""}
                  {formatMinorUnitsToNisDisplay(Math.abs(row.signedEffectMinor))} ₪ ·{" "}
                  {formatDebtCaseInstantHe(row.recordedAtIso)}
                </span>
                {row.reference ? <span> · אסמכתא: {row.reference}</span> : null}
                {row.correctionReasonHe ? <span> · סיבה: {row.correctionReasonHe}</span> : null}
                {canMutate &&
                row.entryType === DebtCaseManualPaymentEntryType.PAYMENT &&
                reversiblePayments.some((p) => p.paymentEntryId === row.paymentEntryId) ? (
                  <form action={dispatchReverse} className={styles.inlineForm}>
                    <input type="hidden" name="debtCaseId" value={record.debtCaseId} />
                    <input
                      type="hidden"
                      name="reversesPaymentEntryId"
                      value={row.paymentEntryId}
                    />
                    <input type="hidden" name="idempotencyKey" value={`${row.paymentEntryId}-rev`} />
                    <input
                      name="correctionReasonHe"
                      type="text"
                      placeholder="סיבת ביטול"
                      required
                      minLength={3}
                      aria-label="סיבת ביטול תשלום"
                    />
                    <Button type="submit" variant="secondary" disabled={reversePending}>
                      ביטול רשומה
                    </Button>
                  </form>
                ) : null}
              </li>
            ))}
          </ul>
          {reverseState.message ? (
            <p className={reverseState.ok ? styles.metaLine : styles.errorBanner} role="status">
              {reverseState.message}
            </p>
          ) : null}
        </div>
      ) : null}

      {canMutate ? (
        <form action={dispatchResponse} className={styles.deliveryForm}>
          <input type="hidden" name="debtCaseId" value={record.debtCaseId} />
          <input type="hidden" name="idempotencyKey" value={responseIdempotency} />
          <h4 className={styles.previewTitle}>תגובת חייב</h4>
          <label>
            סוג תגובה
            <select name="responseType" required defaultValue={DebtCaseDebtorResponseType.NO_RESPONSE}>
              {Object.values(DebtCaseDebtorResponseType).map((type) => (
                <option key={type} value={type}>
                  {formatDebtCaseDebtorResponseTypeHe(type)}
                </option>
              ))}
            </select>
          </label>
          <label>
            תאריך תגובה
            <input
              name="responseDate"
              type="datetime-local"
              required
              defaultValue={paymentDateDefault}
            />
          </label>
          <label>
            הערות עורך דין (סודי)
            <textarea name="lawyerNotes" rows={2} maxLength={2000} />
          </label>
          <Button type="submit" disabled={responsePending}>
            {responsePending ? "שומר…" : "תיעוד תגובה"}
          </Button>
          {responseState.message ? (
            <p className={responseState.ok ? styles.metaLine : styles.errorBanner} role="status">
              {responseState.message}
            </p>
          ) : null}
        </form>
      ) : null}

      {bundle.debtorResponses.length > 0 ? (
        <div>
          <h4 className={styles.previewTitle}>היסטוריית תגובות</h4>
          <ul className={styles.metaList}>
            {bundle.debtorResponses.map((row) => (
              <li key={row.debtorResponseId}>
                {formatDebtCaseDebtorResponseTypeHe(
                  row.responseType as DebtCaseDebtorResponseType,
                )}{" "}
                · {formatDebtCaseInstantHe(row.responseDateIso)}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {canMutate ? (
        <form action={dispatchResolve} className={styles.deliveryForm}>
          <input type="hidden" name="debtCaseId" value={record.debtCaseId} />
          <input type="hidden" name="revision" value={record.revision} />
          <h4 className={styles.previewTitle}>סגירת תיק (ידני)</h4>
          <p className={styles.metaLine}>
            סגירה אינה אוטומטית כשהיתרה מגיעה לאפס — נדרשת החלטת עורך דין.
          </p>
          <label>
            סוג סגירה
            <select name="resolutionKind" required defaultValue={DebtCaseResolutionKind.PAID_IN_FULL}>
              {Object.values(DebtCaseResolutionKind).map((kind) => (
                <option key={kind} value={kind}>
                  {formatDebtCaseResolutionKindHe(kind)}
                </option>
              ))}
            </select>
          </label>
          <label>
            נימוק (חובה בהסדר / סגירה ללא גבייה)
            <textarea name="resolutionReasonHe" rows={2} minLength={3} maxLength={2000} />
          </label>
          <Button type="submit" disabled={resolvePending}>
            {resolvePending ? "סוגר…" : "סגירת תיק"}
          </Button>
          {resolveState.message ? (
            <p className={resolveState.ok ? styles.metaLine : styles.errorBanner} role="status">
              {resolveState.message}
            </p>
          ) : null}
        </form>
      ) : null}

      {isClosed ? (
        <div>
          <p className={styles.metaLine}>
            התיק סגור ידנית
            {record.caseResolutionKind
              ? ` · ${formatDebtCaseResolutionKindHe(record.caseResolutionKind)}`
              : ""}
            {record.caseResolutionAtIso
              ? ` · ${formatDebtCaseInstantHe(record.caseResolutionAtIso)}`
              : ""}
          </p>
          {record.caseResolutionReasonHe ? (
            <p className={styles.metaLine}>נימוק: {record.caseResolutionReasonHe}</p>
          ) : null}
          <form action={dispatchReopen}>
            <input type="hidden" name="debtCaseId" value={record.debtCaseId} />
            <input type="hidden" name="revision" value={record.revision} />
            <Button type="submit" disabled={reopenPending}>
              {reopenPending ? "פותח…" : "פתיחת תיק מחדש"}
            </Button>
          </form>
          {reopenState.message ? (
            <p className={reopenState.ok ? styles.metaLine : styles.errorBanner} role="status">
              {reopenState.message}
            </p>
          ) : null}
        </div>
      ) : null}
    </Wrapper>
  );
}