"use client";

import Link from "next/link";
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
import type { BuildingLegalDocumentInstanceSummary } from "@/modules/building-legal-documents/services/building-legal-document.service";
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
  if (uiStatus === BuildingLegalDocumentUiStatus.SUPERSEDED) {
    return "neutral";
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

function previewHref(buildingId: string, documentId: string): string {
  return `/app/admin/buildings/${buildingId}/legal-documents/${documentId}`;
}

function HistoryList({
  buildingId,
  items,
}: {
  buildingId: string;
  items: BuildingLegalDocumentInstanceSummary[];
}) {
  if (items.length === 0) {
    return null;
  }
  return (
    <details className={styles.historyDetails}>
      <summary className={styles.historySummary}>
        היסטוריה ({items.length} גרסאות שהוחלפו)
      </summary>
      <ul className={styles.historyList}>
        {items.map((item) => (
          <li key={item.buildingLegalDocumentId} className={styles.historyItem}>
            <span>
              גרסה {item.templateRevisionNumber} · הופק {formatDate(item.createdAtIso)}
              {item.supersededAtIso ? ` · הוחלף ${formatDate(item.supersededAtIso)}` : null}
            </span>
            <Link
              className={styles.viewLink}
              href={previewHref(buildingId, item.buildingLegalDocumentId)}
            >
              צפייה
            </Link>
          </li>
        ))}
      </ul>
    </details>
  );
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
            {row.activeInstance ? (
              <>
                <p className={styles.meta}>
                  מסמך פעיל · גרסת תבנית {row.activeInstance.templateRevisionNumber}
                </p>
                <p className={styles.meta}>
                  הופק: {formatDate(row.activeInstance.createdAtIso)}
                </p>
                {row.activeInstance.generatedByFullName ? (
                  <p className={styles.meta}>הופק על ידי: {row.activeInstance.generatedByFullName}</p>
                ) : null}
                <Link
                  className={styles.viewLink}
                  href={previewHref(buildingId, row.activeInstance.buildingLegalDocumentId)}
                >
                  צפייה במסמך הנוכחי
                </Link>
              </>
            ) : (
              <p className={styles.meta}>לא הופק מסמך פעיל לקטגוריה זו.</p>
            )}
            <HistoryList buildingId={buildingId} items={row.supersededHistory} />
            {row.historyCount > row.supersededHistory.length + (row.activeInstance ? 1 : 0) ? (
              <p className={styles.meta}>
                מוצגות {row.supersededHistory.length} רשומות היסטוריות אחרונות מתוך{" "}
                {row.historyCount} סה״כ.
              </p>
            ) : null}
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
