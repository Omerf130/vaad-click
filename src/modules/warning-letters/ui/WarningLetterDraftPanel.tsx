"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/Button/Button";
import { regenerateWarningLetterDraftFormAction } from "@/modules/warning-letters/actions/lawyer-warning-letter-draft.actions";
import { WarningLetterDraftStatus } from "@/modules/warning-letters/domain/warning-letter-draft-status";
import {
  formatWarningLetterDraftInvalidationReasonHe,
  formatWarningLetterDraftStatusHe,
} from "@/modules/warning-letters/presentation/warning-letter-draft-messages.he";
import type { WarningLetterDraftView } from "@/modules/warning-letters/services/warning-letter-draft.service";
import { WarningLetterPreviewPanel } from "@/modules/warning-letters/ui/WarningLetterPreviewPanel";
import styles from "@/modules/warning-letters/ui/WarningLetterPreviewPanel.module.scss";

type Props = {
  draft: WarningLetterDraftView;
  debtCaseId: string;
  /** When true, show regenerate for stale active drafts (not only invalidated). */
  allowRegenerateStaleActive?: boolean;
};

export function WarningLetterDraftPanel({
  draft,
  debtCaseId,
  allowRegenerateStaleActive = false,
}: Props) {
  const [regenerateState, regenerateAction, regeneratePending] = useActionState(
    regenerateWarningLetterDraftFormAction,
    { ok: false },
  );

  const invalidationHe = formatWarningLetterDraftInvalidationReasonHe(draft.invalidationReason);
  const showCurrentPreview =
    draft.status === WarningLetterDraftStatus.ACTIVE && draft.isCurrentForCase;

  return (
    <>
      <section className={styles.previewSection} aria-labelledby="warning-letter-draft-meta-title">
        <h2 id="warning-letter-draft-meta-title" className={styles.previewTitle}>
          טיוטת מכתב התראה (שמורה)
        </h2>
        <dl className={styles.metaList}>
          <div>
            <dt>מספר תיק מכתב</dt>
            <dd>
              <code>{draft.letterCaseReference}</code>
            </dd>
          </div>
          <div>
            <dt>סטטוס טיוטה</dt>
            <dd>
              {formatWarningLetterDraftStatusHe(draft.status, {
                isCurrentForCase: draft.isCurrentForCase,
              })}
            </dd>
          </div>
          <div>
            <dt>גרסת טיוטה</dt>
            <dd>{draft.draftRevision}</dd>
          </div>
          <div>
            <dt>גרסת תבנית</dt>
            <dd>{draft.templateVersionId}</dd>
          </div>
          <div>
            <dt>מוכן לאישור עתידי</dt>
            <dd>{draft.approvalReady ? "כן" : "לא — חסרים נתונים או נדרש אישור ניסוח משפטי"}</dd>
          </div>
        </dl>

        {showCurrentPreview ? (
          <p className={styles.bannerSuccess} role="status">
            תצוגת המכתב משקפת את הטיוטה השמורה (גרסה {draft.draftRevision}) — לא נתוני תיק חיים.
          </p>
        ) : null}

        {draft.status === WarningLetterDraftStatus.INVALIDATED && invalidationHe ? (
          <p className={styles.incompleteWarning} role="status">
            טיוטה היסטורית — לא לשימוש: {invalidationHe}
            {draft.invalidatedAtIso
              ? ` · ${new Date(draft.invalidatedAtIso).toLocaleString("he-IL")}`
              : ""}
          </p>
        ) : null}

        {!draft.approvalReady && draft.unapprovedTemplateVariantIds.length > 0 ? (
          <p className={styles.incompleteWarning} role="status">
            גרסאות ניסוח משפטי בטיוטה טרם אושרו על ידי עורך דין — לא ניתן לסמן כמוכן לאישור סופי.
          </p>
        ) : null}

        {!draft.isCurrentForCase && draft.status === WarningLetterDraftStatus.ACTIVE ? (
          <p className={styles.incompleteWarning} role="status">
            גוף המכתב השמור אינו משקף את נתוני התיק הנוכחיים — לא מוצג כטיוטה נוכחית.
          </p>
        ) : null}

        {draft.status === WarningLetterDraftStatus.INVALIDATED ||
        (allowRegenerateStaleActive &&
          draft.status === WarningLetterDraftStatus.ACTIVE &&
          !draft.isCurrentForCase) ? (
          <form action={regenerateAction} className={styles.regenerateForm}>
            <input type="hidden" name="debtCaseId" value={debtCaseId} />
            <Button type="submit" disabled={regeneratePending}>
              {regeneratePending
                ? "יוצר מחדש…"
                : draft.status === WarningLetterDraftStatus.ACTIVE
                  ? "יצירת גרסת טיוטה מעודכנת"
                  : "יצירה מחדש של טיוטה"}
            </Button>
            {regenerateState.message ? (
              <p className={regenerateState.ok ? styles.bannerSuccess : styles.incompleteWarning}>
                {regenerateState.message}
              </p>
            ) : null}
          </form>
        ) : null}
      </section>

      {showCurrentPreview ? (
        <WarningLetterPreviewPanel
          snapshot={draft.snapshot}
          contentSha256={draft.contentSha256}
          previewWarningHe={draft.previewWarningHe}
          letterCaseReference={draft.letterCaseReference}
        />
      ) : (
        <p className={styles.incompleteWarning} role="status">
          תצוגת גוף המכתב תופיע לאחר יצירת טיוטה פעילה מעודכנת.
        </p>
      )}
    </>
  );
}
