"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/Button/Button";
import { StatusBadge } from "@/components/ui/StatusBadge/StatusBadge";
import {
  generateBuildingLegalDocumentFormAction,
  type BuildingLegalDocumentActionState,
} from "@/modules/building-legal-documents/actions/building-legal-document.actions";
import { BuildingLegalDocumentUiStatus } from "@/modules/building-legal-documents/domain/building-legal-document-status";
import {
  buildingLegalDocumentUiStatusLabelHe,
  formatBuildingLegalDocumentGenerationBlockHe,
} from "@/modules/building-legal-documents/presentation/building-legal-document-messages.he";
import type { BuildingLegalDocumentCategoryAdminView } from "@/modules/building-legal-documents/services/building-legal-document.service";
import styles from "@/modules/building-legal-documents/ui/BuildingLegalDocumentsAdminPanel.module.scss";

type Props = {
  buildingId: string;
  categories: BuildingLegalDocumentCategoryAdminView[];
};

const initialState: BuildingLegalDocumentActionState = { ok: false };

function statusBadgeVariant(
  uiStatus: BuildingLegalDocumentUiStatus,
): "neutral" | "info" | "warning" | "success" {
  if (uiStatus === BuildingLegalDocumentUiStatus.GENERATED_PENDING_SIGNATURE) {
    return "warning";
  }
  return "neutral";
}

function formatDate(iso: string | null | undefined): string {
  if (!iso) {
    return "—";
  }
  return new Date(iso).toLocaleString("he-IL", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export function BuildingLegalDocumentsAdminPanel({ buildingId, categories }: Props) {
  const [state, formAction, pending] = useActionState(
    generateBuildingLegalDocumentFormAction,
    initialState,
  );

  return (
    <section className={styles.section} aria-labelledby="building-legal-docs-title">
      <h2 id="building-legal-docs-title" className={styles.sectionTitle}>
        מסמכים משפטיים
      </h2>
      <p className={styles.intro}>
        הפקת מסמך לבניין מבוססת על תבנית שפורסמה ואושרה. הפקה אינה חתימה ואינה מסמנת השלמה משפטית.
      </p>
      {state.message ? (
        <p
          className={state.ok ? styles.feedbackSuccess : styles.feedbackError}
          role="status"
          aria-live="polite"
        >
          {state.message}
        </p>
      ) : null}
      <div className={styles.grid}>
        {categories.map((row) => (
          <article key={row.category} className={styles.card}>
            <h3 className={styles.cardTitle}>{row.titleHe}</h3>
            <StatusBadge
              label={buildingLegalDocumentUiStatusLabelHe(row.uiStatus)}
              variant={statusBadgeVariant(row.uiStatus)}
            />
            <p className={styles.meta}>
              סטטוס: {buildingLegalDocumentUiStatusLabelHe(row.uiStatus)}
            </p>
            {row.activeInstance ? (
              <>
                <p className={styles.meta}>
                  תבנית: גרסה {row.activeInstance.templateRevisionNumber}
                </p>
                <p className={styles.meta}>הופק: {formatDate(row.activeInstance.createdAtIso)}</p>
                <details className={styles.snapshotDetails}>
                  <summary className={styles.snapshotSummary}>צילום תוכן שהופק</summary>
                  <pre className={styles.snapshotBody} dir="rtl">
                    {row.activeInstance.renderedContentSnapshot || "(ריק)"}
                  </pre>
                </details>
              </>
            ) : (
              <p className={styles.meta}>לא הופק מסמך פעיל לקטגוריה זו.</p>
            )}
            {row.publishedTemplateRevisionNumber != null ? (
              <p className={styles.meta}>
                תבנית זמינה להפקה: גרסה {row.publishedTemplateRevisionNumber}
              </p>
            ) : null}
            {row.generationBlockCode ? (
              <p className={styles.blockReason} role="status">
                {formatBuildingLegalDocumentGenerationBlockHe(row.generationBlockCode)}
              </p>
            ) : null}
            {row.historyCount > 1 ? (
              <p className={styles.meta}>היסטוריה: {row.historyCount} רשומות</p>
            ) : null}
            <form action={formAction} className={styles.inlineForm}>
              <input type="hidden" name="buildingId" value={buildingId} />
              <input type="hidden" name="category" value={row.category} />
              <Button
                type="submit"
                variant={row.activeInstance ? "secondary" : "primary"}
                size="sm"
                disabled={pending || !row.generationAllowed}
              >
                {row.activeInstance ? "הפקה מחדש" : "הפקת מסמך"}
              </Button>
            </form>
          </article>
        ))}
      </div>
    </section>
  );
}
