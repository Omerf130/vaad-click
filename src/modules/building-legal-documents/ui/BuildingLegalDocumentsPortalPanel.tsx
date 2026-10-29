import Link from "next/link";

import { StatusBadge } from "@/components/ui/StatusBadge/StatusBadge";
import { BuildingLegalDocumentUiStatus } from "@/modules/building-legal-documents/domain/building-legal-document-status";
import {
  buildingLegalDocumentUiStatusLabelHe,
  PORTAL_SIGNATURE_UNAVAILABLE_HE,
} from "@/modules/building-legal-documents/presentation/building-legal-document-messages.he";
import type { BuildingLegalDocumentCategoryPortalView } from "@/modules/building-legal-documents/services/building-legal-document.service";
import styles from "@/modules/building-legal-documents/ui/BuildingLegalDocumentsPortalPanel.module.scss";

type Props = {
  buildingId: string;
  categories: BuildingLegalDocumentCategoryPortalView[];
};

function formatDate(iso: string | null): string | null {
  if (!iso) {
    return null;
  }
  return new Date(iso).toLocaleString("he-IL", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export function BuildingLegalDocumentsPortalPanel({ buildingId, categories }: Props) {
  return (
    <section className={styles.panel} aria-labelledby="portal-legal-docs-title">
      <h2 id="portal-legal-docs-title" className={styles.title}>
        סטטוס מסמכים משפטיים
      </h2>
      <p className={styles.hint}>תצוגת סטטוס וצפייה במסמכים שהופקו לבניין — לקריאה בלבד.</p>
      <ul className={styles.list}>
        {categories.map((row) => {
          const generatedAt = formatDate(row.createdAtIso);
          const hasActive =
            row.uiStatus === BuildingLegalDocumentUiStatus.GENERATED_PENDING_SIGNATURE &&
            row.activeBuildingLegalDocumentId;

          return (
            <li key={row.category} className={styles.row}>
              <div className={styles.rowMain}>
                <span className={styles.rowLabel}>{row.titleHe}</span>
                <StatusBadge
                  label={buildingLegalDocumentUiStatusLabelHe(row.uiStatus)}
                  variant={hasActive ? "warning" : "neutral"}
                />
              </div>
              {hasActive ? (
                <div className={styles.rowMeta}>
                  {row.templateRevisionNumber != null ? (
                    <span>גרסת תבנית {row.templateRevisionNumber}</span>
                  ) : null}
                  {generatedAt ? <span> · הופק {generatedAt}</span> : null}
                  <Link
                    className={styles.viewLink}
                    href={`/app/buildings/${buildingId}/legal-documents/${row.activeBuildingLegalDocumentId}`}
                  >
                    צפייה במסמך
                  </Link>
                </div>
              ) : (
                <p className={styles.emptyLine}>לא הופק מסמך לקטגוריה זו.</p>
              )}
            </li>
          );
        })}
      </ul>
      <p className={styles.signatureNote}>{PORTAL_SIGNATURE_UNAVAILABLE_HE}</p>
    </section>
  );
}
