import Link from "next/link";

import { StatusBadge } from "@/components/ui/StatusBadge/StatusBadge";
import type {
  LegalReadinessChecklistItem,
  LegalReadinessItemStatus,
  WarningLetterLegalReadinessChecklist,
} from "@/modules/warning-letters/services/warning-letter-legal-readiness-checklist.service";
import tabStyles from "@/modules/warning-letters/ui/WarningLetterCaseTab.module.scss";

type Props = {
  checklist: WarningLetterLegalReadinessChecklist;
};

const GROUP_ORDER: LegalReadinessItemStatus[] = [
  "missing",
  "needs_lawyer",
  "blocked_integration",
  "complete",
];

const GROUP_LABELS: Record<LegalReadinessItemStatus, string> = {
  missing: "דרישות חסרות",
  needs_lawyer: "החלטות / אישורי עורך דין",
  blocked_integration: "חסום — אינטגרציה עתידית",
  complete: "הושלם",
};

function badgeVariant(
  status: LegalReadinessItemStatus,
): "success" | "warning" | "neutral" {
  switch (status) {
    case "complete":
      return "success";
    case "missing":
    case "needs_lawyer":
      return "warning";
    default:
      return "neutral";
  }
}

function badgeLabel(status: LegalReadinessItemStatus): string {
  switch (status) {
    case "complete":
      return "הושלם";
    case "missing":
      return "חסר";
    case "needs_lawyer":
      return "דורש עו\"ד";
    case "blocked_integration":
      return "אינטגרציה";
    default:
      return status;
  }
}

function groupItems(
  items: LegalReadinessChecklistItem[],
  status: LegalReadinessItemStatus,
): LegalReadinessChecklistItem[] {
  return items.filter((item) => item.status === status);
}

export function WarningLetterReadinessGroupedPanel({ checklist }: Props) {
  const counts = GROUP_ORDER.map((status) => ({
    status,
    count: groupItems(checklist.items, status).length,
  }));

  return (
    <div className={tabStyles.readinessRoot}>
      <p className={tabStyles.readinessIntro}>
        סיכום מוכנות משפטית לפי נתוני המערכת — אין לדלג על דרישות חסרות.
      </p>
      <p className={tabStyles.linkRow}>
        <Link href="/app/admin/warning-letter-templates">אישור גרסאות תבנית (גלובלי)</Link>
      </p>

      <dl className={tabStyles.gateSummaryCompact}>
        <div>
          <dt>אישור נוסח</dt>
          <dd>
            <StatusBadge
              variant={checklist.wordingApprovalAllowed ? "success" : "warning"}
              label={checklist.wordingApprovalAllowed ? "מותר" : "חסום"}
            />
          </dd>
        </div>
        <div>
          <dt>סגירת מסמך</dt>
          <dd>
            <StatusBadge
              variant={checklist.finalizationAllowed ? "success" : "warning"}
              label={checklist.finalizationAllowed ? "מותר" : "חסום"}
            />
          </dd>
        </div>
        <div>
          <dt>תיעוד הגשה</dt>
          <dd>
            <StatusBadge
              variant={checklist.dispatchAllowed ? "success" : "warning"}
              label={checklist.dispatchAllowed ? "מותר" : "חסום"}
            />
          </dd>
        </div>
      </dl>

      <ul className={tabStyles.countRow} aria-label="סיכום לפי קטגוריה">
        {counts.map(({ status, count }) =>
          count > 0 ? (
            <li key={status}>
              <StatusBadge variant={badgeVariant(status)} label={`${GROUP_LABELS[status]} (${count})`} />
            </li>
          ) : null,
        )}
      </ul>

      {GROUP_ORDER.map((status) => {
        const items = groupItems(checklist.items, status);
        if (items.length === 0) {
          return null;
        }
        const defaultOpen = status === "missing" || status === "needs_lawyer";
        return (
          <details key={status} className={tabStyles.readinessGroup} open={defaultOpen}>
            <summary className={tabStyles.readinessGroupSummary}>
              {GROUP_LABELS[status]} ({items.length})
            </summary>
            <ul className={tabStyles.readinessItemList}>
              {items.map((item) => (
                <li key={item.id} className={tabStyles.readinessItem}>
                  <div className={tabStyles.readinessItemHead}>
                    <span>{item.labelHe}</span>
                    <StatusBadge variant={badgeVariant(item.status)} label={badgeLabel(item.status)} />
                  </div>
                  {item.detailHe ? <p className={tabStyles.readinessDetail}>{item.detailHe}</p> : null}
                </li>
              ))}
            </ul>
          </details>
        );
      })}
    </div>
  );
}
