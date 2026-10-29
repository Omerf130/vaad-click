import { StatusBadge } from "@/components/ui/StatusBadge/StatusBadge";
import { BuildingLegalDocumentUiStatus } from "@/modules/building-legal-documents/domain/building-legal-document-status";
import {
  buildingLegalDocumentUiStatusLabelHe,
  PORTAL_SIGNATURE_UNAVAILABLE_HE,
} from "@/modules/building-legal-documents/presentation/building-legal-document-messages.he";
import type { BuildingLegalDocumentCategoryPortalView } from "@/modules/building-legal-documents/services/building-legal-document.service";
import styles from "@/modules/building-legal-documents/ui/BuildingLegalDocumentsPortalPanel.module.scss";

type Props = {
  categories: BuildingLegalDocumentCategoryPortalView[];
};

export function BuildingLegalDocumentsPortalPanel({ categories }: Props) {
  return (
    <section className={styles.panel} aria-labelledby="portal-legal-docs-title">
      <h2 id="portal-legal-docs-title" className={styles.title}>
        סטטוס מסמכים משפטיים
      </h2>
      <p className={styles.hint}>תצוגת סטטוס בלבד — ללא גישה לניסוחי תבנית או להפקה.</p>
      <ul className={styles.list}>
        {categories.map((row) => (
          <li key={row.category} className={styles.row}>
            <span className={styles.rowLabel}>{row.titleHe}</span>
            <StatusBadge
              label={buildingLegalDocumentUiStatusLabelHe(row.uiStatus)}
              variant={
                row.uiStatus === BuildingLegalDocumentUiStatus.GENERATED_PENDING_SIGNATURE
                  ? "warning"
                  : "neutral"
              }
            />
          </li>
        ))}
      </ul>
      <p className={styles.signatureNote}>{PORTAL_SIGNATURE_UNAVAILABLE_HE}</p>
    </section>
  );
}
