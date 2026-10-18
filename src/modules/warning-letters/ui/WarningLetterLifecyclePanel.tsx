"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/Button/Button";
import {
  authorizeWarningLetterDeliveryFormAction,
  finalizeWarningLetterFormAction,
  recordWarningLetterDeliveryDetailsFormAction,
  type WarningLetterLifecycleActionState,
} from "@/modules/warning-letters/actions/lawyer-warning-letter-lifecycle.actions";
import {
  formatWarningLetterDeliveryChannelHe,
  WarningLetterDeliveryChannel,
} from "@/modules/warning-letters/domain/warning-letter-delivery-channel";
import type { WarningLetterDeliveryRecordView } from "@/modules/warning-letters/services/warning-letter-delivery.service";
import type { WarningLetterFinalDocumentView } from "@/modules/warning-letters/services/warning-letter-finalization.service";
import type { WarningLetterLegalReadinessChecklist } from "@/modules/warning-letters/services/warning-letter-legal-readiness-checklist.service";
import styles from "@/modules/warning-letters/ui/WarningLetterPreviewPanel.module.scss";

type Props = {
  debtCaseId: string;
  buildingId: string;
  draftId: string | null;
  checklist: WarningLetterLegalReadinessChecklist;
  finalDocument: WarningLetterFinalDocumentView | null;
  deliveryRecords: WarningLetterDeliveryRecordView[];
  debtorDisplayName: string;
  embedded?: boolean;
};

const initialState: WarningLetterLifecycleActionState = { ok: false };

export function WarningLetterLifecyclePanel({
  debtCaseId,
  buildingId,
  draftId,
  checklist,
  finalDocument,
  deliveryRecords,
  debtorDisplayName,
  embedded = false,
}: Props) {
  const [finalizeState, dispatchFinalize, finalizePending] = useActionState(
    finalizeWarningLetterFormAction,
    initialState,
  );
  const [deliveryState, dispatchDelivery, deliveryPending] = useActionState(
    authorizeWarningLetterDeliveryFormAction,
    initialState,
  );
  const [detailsState, dispatchDetails, detailsPending] = useActionState(
    recordWarningLetterDeliveryDetailsFormAction,
    initialState,
  );

  const Wrapper = embedded ? "div" : "section";
  const wrapperProps = embedded
    ? { className: styles.lifecycleEmbedded }
    : {
        className: styles.section,
        "aria-labelledby": "wl-lifecycle-title" as const,
      };

  return (
    <Wrapper {...wrapperProps}>
      <h3 id={embedded ? undefined : "wl-lifecycle-title"} className={styles.sectionTitle}>
        סגירה והגשה (ללא שליחה אוטומטית)
      </h3>
      <p className={styles.metaLine}>
        תיעוד הגשה ידני — לא שליחת הודעה. אין הפעלה אוטומטית של ווטסאפ, SMS או דוא&quot;ל.
      </p>

      {[finalizeState, deliveryState, detailsState].map(
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
        <p className={styles.metaLine}>
          רישום סגירה: {finalDocument.finalDocumentId.slice(0, 8)}… · גרסת טיוטה{" "}
          {finalDocument.draftRevision} · {finalDocument.status}
        </p>
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

      <h4 className={styles.subsectionTitle}>תיעוד הגשה ידני</h4>
      <form action={dispatchDelivery} className={styles.deliveryForm}>
        <input type="hidden" name="debtCaseId" value={debtCaseId} />
        <input type="hidden" name="buildingId" value={buildingId} />
        <input
          type="hidden"
          name="finalDocumentId"
          value={finalDocument?.finalDocumentId ?? ""}
        />
        <label>
          ערוץ
          <select name="channel" defaultValue={WarningLetterDeliveryChannel.WHATSAPP_MANUAL}>
            <option value={WarningLetterDeliveryChannel.WHATSAPP_MANUAL}>
              {formatWarningLetterDeliveryChannelHe(WarningLetterDeliveryChannel.WHATSAPP_MANUAL)}
            </option>
            <option value={WarningLetterDeliveryChannel.REGISTERED_MAIL}>
              {formatWarningLetterDeliveryChannelHe(WarningLetterDeliveryChannel.REGISTERED_MAIL)}
            </option>
          </select>
        </label>
        <label>
          נמען
          <input name="recipientDisplayName" defaultValue={debtorDisplayName} required />
        </label>
        <label>
          פרטי קשר (תיעוד)
          <input name="recipientContactHint" placeholder="טלפון / כתובת — לתיעוד בלבד" />
        </label>
        <Button
          type="submit"
          variant="secondary"
          size="sm"
          disabled={!checklist.dispatchAllowed || !finalDocument || deliveryPending}
        >
          רישום הרשאה לתיעוד הגשה
        </Button>
      </form>

      {deliveryRecords.length > 0 ? (
        <ul className={styles.metaList}>
          {deliveryRecords.map((record) => (
            <li key={record.deliveryRecordId}>
              <p className={styles.metaLine}>
                {formatWarningLetterDeliveryChannelHe(record.channel)} · {record.status} ·{" "}
                {record.recipientDisplayName}
              </p>
              <form action={dispatchDetails} className={styles.deliveryForm}>
                <input type="hidden" name="debtCaseId" value={debtCaseId} />
                <input type="hidden" name="deliveryRecordId" value={record.deliveryRecordId} />
                <label>
                  מספר מעקב / רשומה
                  <input name="trackingReference" />
                </label>
                <label>
                  הערת הוכחה (ידני)
                  <textarea name="evidenceNote" rows={2} />
                </label>
                <Button type="submit" variant="secondary" size="sm" disabled={detailsPending}>
                  שמירת תיעוד
                </Button>
              </form>
            </li>
          ))}
        </ul>
      ) : null}
    </Wrapper>
  );
}
