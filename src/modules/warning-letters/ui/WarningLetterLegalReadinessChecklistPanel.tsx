import { StatusBadge } from "@/components/ui/StatusBadge/StatusBadge";
import type {
  LegalReadinessChecklistItem,
  WarningLetterLegalReadinessChecklist,
} from "@/modules/warning-letters/services/warning-letter-legal-readiness-checklist.service";
import styles from "@/modules/warning-letters/ui/WarningLetterPreviewPanel.module.scss";

type Props = {
  checklist: WarningLetterLegalReadinessChecklist;
};

function statusBadge(item: LegalReadinessChecklistItem) {
  switch (item.status) {
    case "complete":
      return <StatusBadge variant="success" label="הושלם" />;
    case "missing":
      return <StatusBadge variant="warning" label="חסר" />;
    case "needs_lawyer":
      return <StatusBadge variant="warning" label="דורש עורך דין" />;
    case "blocked_integration":
      return <StatusBadge variant="neutral" label="חסום — אינטגרציה" />;
    default:
      return <StatusBadge variant="neutral" label={item.status} />;
  }
}

export function WarningLetterLegalReadinessChecklistPanel({ checklist }: Props) {
  return (
    <section className={styles.section} aria-labelledby="wl-legal-readiness-title">
      <h3 id="wl-legal-readiness-title" className={styles.sectionTitle}>
        מוכנות משפטית — מכתב התראה
      </h3>
      <ul className={styles.checklistItems}>
        {checklist.items.map((item) => (
          <li key={item.id}>
            <div className={styles.metaRow}>
              <span>{item.labelHe}</span>
              {statusBadge(item)}
            </div>
            {item.detailHe ? <p className={styles.metaLine}>{item.detailHe}</p> : null}
          </li>
        ))}
      </ul>
      <dl className={styles.gateSummary}>
        <div>
          <dt>אישור נוסח</dt>
          <dd>{checklist.wordingApprovalAllowed ? "מותר" : "חסום"}</dd>
        </div>
        <div>
          <dt>סגירת מסמך סופי</dt>
          <dd>{checklist.finalizationAllowed ? "מותר" : "חסום"}</dd>
        </div>
        <div>
          <dt>הגשה / תיעוד משלוח</dt>
          <dd>{checklist.dispatchAllowed ? "מותר" : "חסום"}</dd>
        </div>
      </dl>
    </section>
  );
}
