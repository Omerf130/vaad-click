"use client";

import { useMemo, useState } from "react";

import { ButtonLink } from "@/components/ui/Button/ButtonLink";
import { formatLawyerVerificationStatusHeForOperator } from "@/modules/buildings/presentation/building-labels.he";
import type { OperatorDashboardBuilding } from "@/modules/portal/services/operator-portal-dashboard.service";
import styles from "@/modules/portal/ui/OperatorPortalDashboard.module.scss";

type SortKey = "name" | "cases" | "returned";

type Props = {
  buildings: OperatorDashboardBuilding[];
  showEmptyHint?: boolean;
};

export function ManagementCompanyBuildingExplorer({ buildings, showEmptyHint = false }: Props) {
  const [query, setQuery] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("name");

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    let rows = buildings;
    if (normalized) {
      rows = rows.filter(
        (b) =>
          b.displayName.toLowerCase().includes(normalized) ||
          b.city.toLowerCase().includes(normalized),
      );
    }
    const sorted = [...rows];
    sorted.sort((a, b) => {
      switch (sortKey) {
        case "cases":
          return b.metrics.totalDebtCases - a.metrics.totalDebtCases;
        case "returned":
          return b.metrics.returnedForCompletion - a.metrics.returnedForCompletion;
        default:
          return a.displayName.localeCompare(b.displayName, "he");
      }
    });
    return sorted;
  }, [buildings, query, sortKey]);

  return (
    <div className={styles.buildingExplorer}>
      <div className={styles.buildingExplorerControls}>
        <label className={styles.searchLabel}>
          חיפוש בניין
          <input
            type="search"
            className={styles.searchInput}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="שם או עיר"
            aria-label="חיפוש בניין"
          />
        </label>
        <label className={styles.searchLabel}>
          מיון
          <select
            className={styles.sortSelect}
            value={sortKey}
            onChange={(event) => setSortKey(event.target.value as SortKey)}
            aria-label="מיון בניינים"
          >
            <option value="name">לפי שם</option>
            <option value="cases">לפי מספר תיקים</option>
            <option value="returned">לפי תיקים שהוחזרו</option>
          </select>
        </label>
      </div>

      {buildings.length === 0 && showEmptyHint ? (
        <p className={styles.emptyState}>עדיין לא נוספו בניינים — השתמשו ב«הוספת בניין» למעלה.</p>
      ) : null}

      {filtered.length === 0 && buildings.length > 0 ? (
        <p className={styles.emptyState}>לא נמצאו בניינים התואמים לחיפוש.</p>
      ) : filtered.length === 0 ? null : (
        <div className={styles.buildingGrid}>
          {filtered.map((building) => (
            <article key={building.buildingId} className={styles.buildingCard}>
              <h3 className={styles.buildingCardTitle}>{building.displayName}</h3>
              <p className={styles.buildingCardMeta}>
                {[building.city, `${building.metrics.totalDebtCases} תיקי חוב`]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
              <p className={styles.buildingCardMeta}>
                {building.metrics.returnedForCompletion} הוחזרו להשלמה ·{" "}
                {building.metrics.pendingLawyerReview} ממתינים לעו&quot;ד
              </p>
              <p className={styles.verificationBadge}>
                {formatLawyerVerificationStatusHeForOperator(building.lawyerVerificationStatus)}
              </p>
              <ButtonLink href={`/app/buildings/${building.buildingId}`} size="sm">
                כניסה לבניין
              </ButtonLink>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
