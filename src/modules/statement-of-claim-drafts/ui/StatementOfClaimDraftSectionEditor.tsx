"use client";

import { useActionState, useMemo } from "react";

import { Button } from "@/components/ui/Button/Button";
import {
  saveStatementOfClaimDraftEditsFormAction,
  type AdminStatementOfClaimDraftEditActionState,
} from "@/modules/statement-of-claim-drafts/actions/admin-statement-of-claim-draft.actions";
import {
  normalizeLegacyStatementOfClaimSection,
  resolveStatementOfClaimSectionDisplayBody,
  resolveStatementOfClaimSectionDisplayTitle,
} from "@/modules/statement-of-claim-drafts/domain/statement-of-claim-draft-content-snapshot.types";
import type { StatementOfClaimDraftView } from "@/modules/statement-of-claim-drafts/services/statement-of-claim-draft.service";
import styles from "@/modules/statement-of-claim-drafts/ui/StatementOfClaimDraftPanel.module.scss";

type Props = {
  debtCaseId: string;
  activeDraft: StatementOfClaimDraftView;
};

const editInitial: AdminStatementOfClaimDraftEditActionState = { ok: false, message: "" };

export function StatementOfClaimDraftSectionEditor({ debtCaseId, activeDraft }: Props) {
  const [saveState, dispatchSave, savePending] = useActionState(
    saveStatementOfClaimDraftEditsFormAction,
    editInitial,
  );

  const sections = useMemo(
    () =>
      activeDraft.contentSnapshot.sections.map((s) =>
        normalizeLegacyStatementOfClaimSection(s),
      ),
    [activeDraft.contentSnapshot.sections],
  );

  return (
    <div className={styles.sectionCard}>
      <h3 className={styles.sectionTitle}>עריכת מקטעים (עורך דין)</h3>
      <p className={styles.statusMessage}>
        שורות המסומנות כ«נתוני מערכת» נשמרות כבסיס עובדתי ואינן נדרסות בשמירה. יצירה מחדש מנתוני
        מערכת דורשת אישור מפורש.
      </p>

      <form action={dispatchSave}>
        <input type="hidden" name="debtCaseId" value={debtCaseId} />
        <input type="hidden" name="sourceDraftId" value={activeDraft.draftId} />
        <input
          type="hidden"
          name="expectedConcurrencyRevision"
          value={activeDraft.concurrencyRevision}
        />

        {sections.map((section) => {
          const displayTitle = resolveStatementOfClaimSectionDisplayTitle(section);
          const displayBody = resolveStatementOfClaimSectionDisplayBody(section);
          return (
            <fieldset key={section.sectionId} style={{ marginBottom: "1rem", border: "none", padding: 0 }}>
              <input type="hidden" name="sectionId" value={section.sectionId} />
              <label className={styles.sectionTitle} htmlFor={`title_${section.sectionId}`}>
                כותרת מקטע
              </label>
              <input
                id={`title_${section.sectionId}`}
                name={`title_${section.sectionId}`}
                defaultValue={displayTitle}
                className={styles.sectionBody}
                style={{ width: "100%", marginBottom: "0.5rem" }}
              />
              <p className={styles.systemBaselineHint}>
                בסיס מערכת: {section.bodySystemBaseline.slice(0, 120)}
                {section.bodySystemBaseline.length > 120 ? "…" : ""}
              </p>
              <label className={styles.sectionTitle} htmlFor={`body_${section.sectionId}`}>
                גוף מקטע
              </label>
              <textarea
                id={`body_${section.sectionId}`}
                name={`body_${section.sectionId}`}
                defaultValue={displayBody}
                rows={6}
                className={styles.sectionBody}
                style={{ width: "100%" }}
              />
            </fieldset>
          );
        })}

        <Button type="submit" disabled={savePending} variant="primary">
          שמור שינויים
        </Button>
      </form>

      {saveState.message ? (
        <p
          className={`${styles.statusMessage} ${saveState.ok ? styles.statusOk : styles.statusError}`}
          role="status"
        >
          {saveState.message}
        </p>
      ) : null}
    </div>
  );
}