"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/Button/Button";
import { regenerateWarningLetterDraftFormAction } from "@/modules/warning-letters/actions/lawyer-warning-letter-draft.actions";
import { WarningLetterDraftLoadState } from "@/modules/warning-letters/domain/warning-letter-draft-load-state";
import {
  formatWarningLetterDraftInvalidationReasonHe,
  formatWarningLetterDraftLoadStateHe,
} from "@/modules/warning-letters/presentation/warning-letter-draft-messages.he";
import type { WarningLetterDraftDetailResult } from "@/modules/warning-letters/services/warning-letter-draft.service";
import { WarningLetterDraftPanel } from "@/modules/warning-letters/ui/WarningLetterDraftPanel";
import styles from "@/modules/warning-letters/ui/WarningLetterPreviewPanel.module.scss";

type Props = {
  detail: WarningLetterDraftDetailResult;
  debtCaseId: string;
};

function RegenerateDraftForm({
  debtCaseId,
  label,
}: {
  debtCaseId: string;
  label: string;
}) {
  const [regenerateState, regenerateAction, regeneratePending] = useActionState(
    regenerateWarningLetterDraftFormAction,
    { ok: false },
  );

  return (
    <form action={regenerateAction} className={styles.regenerateForm}>
      <input type="hidden" name="debtCaseId" value={debtCaseId} />
      <Button type="submit" disabled={regeneratePending}>
        {regeneratePending ? "יוצר מחדש…" : label}
      </Button>
      {regenerateState.message ? (
        <p className={regenerateState.ok ? styles.bannerSuccess : styles.incompleteWarning}>
          {regenerateState.message}
        </p>
      ) : null}
    </form>
  );
}

export function WarningLetterDraftDetailPanel({ detail, debtCaseId }: Props) {
  const loadStateHe = formatWarningLetterDraftLoadStateHe(detail.loadState);
  const invalidationHe = formatWarningLetterDraftInvalidationReasonHe(detail.invalidationReason);

  if (
    detail.loadState === WarningLetterDraftLoadState.ACTIVE_CURRENT ||
    detail.loadState === WarningLetterDraftLoadState.ACTIVE_STALE
  ) {
    if (!detail.draft) {
      return null;
    }
    return (
      <WarningLetterDraftPanel
        draft={detail.draft}
        debtCaseId={debtCaseId}
        allowRegenerateStaleActive={
          detail.loadState === WarningLetterDraftLoadState.ACTIVE_STALE
        }
      />
    );
  }

  return (
    <section className={styles.previewSection} aria-labelledby="warning-letter-draft-status-title">
      <h2 id="warning-letter-draft-status-title" className={styles.previewTitle}>
        טיוטת מכתב התראה
      </h2>
      <p className={styles.incompleteWarning} role="status">
        {loadStateHe}
      </p>
      {detail.letterCaseReference ? (
        <p className={styles.metaLine}>
          מספר תיק מכתב (שרשרת): <code>{detail.letterCaseReference}</code>
          {detail.latestDraftRevision != null ? ` · גרסה אחרונה ${detail.latestDraftRevision}` : ""}
        </p>
      ) : null}
      {invalidationHe && detail.invalidatedAtIso ? (
        <p className={styles.metaLine}>
          {invalidationHe} · {new Date(detail.invalidatedAtIso).toLocaleString("he-IL")}
        </p>
      ) : null}
      {(detail.loadState === WarningLetterDraftLoadState.NEEDS_REGENERATION ||
        detail.loadState === WarningLetterDraftLoadState.NO_DRAFT_YET) && (
        <RegenerateDraftForm
          debtCaseId={debtCaseId}
          label={
            detail.loadState === WarningLetterDraftLoadState.NO_DRAFT_YET
              ? "יצירת טיוטה ראשונה"
              : "יצירה מחדש של טיוטה"
          }
        />
      )}
    </section>
  );
}
