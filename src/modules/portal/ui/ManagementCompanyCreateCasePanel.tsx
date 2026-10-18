"use client";

import { useActionState, useState } from "react";

import { Button } from "@/components/ui/Button/Button";
import { createDebtCaseDraftFormAction } from "@/modules/debt-cases/actions/portal-debt-case.actions";
import type { PortalDebtCaseActionState } from "@/modules/debt-cases/actions/portal-debt-case.actions";
import type { OperatorDashboardBuilding } from "@/modules/portal/services/operator-portal-dashboard.service";
import styles from "@/modules/portal/ui/OperatorPortalDashboard.module.scss";

const initial: PortalDebtCaseActionState = { ok: false };

type Props = {
  buildings: OperatorDashboardBuilding[];
};

export function ManagementCompanyCreateCasePanel({ buildings }: Props) {
  const [buildingId, setBuildingId] = useState(buildings[0]?.buildingId ?? "");
  const [state, formAction, pending] = useActionState(createDebtCaseDraftFormAction, initial);

  if (buildings.length === 0) {
    return null;
  }

  return (
    <section className={styles.quickCreateSection} aria-labelledby="mc-create-case-title">
      <h2 id="mc-create-case-title" className={styles.sectionTitle}>
        פתיחת תיק חוב חדש
      </h2>
      <p className={styles.sectionHint}>
        בחרו בניין מורשה — השרת מאמת הרשאה לפני יצירת הטיוטה.
      </p>
      <form action={formAction} className={styles.quickCreateForm}>
        <label className={styles.searchLabel}>
          בניין
          <select
            name="buildingId"
            className={styles.sortSelect}
            value={buildingId}
            onChange={(event) => setBuildingId(event.target.value)}
            required
            aria-label="בחירת בניין לתיק חדש"
          >
            {buildings.map((building) => (
              <option key={building.buildingId} value={building.buildingId}>
                {building.displayName}
                {building.city ? ` · ${building.city}` : ""}
              </option>
            ))}
          </select>
        </label>
        <Button type="submit" disabled={pending || !buildingId}>
          {pending ? "יוצר תיק…" : "תיק חוב חדש"}
        </Button>
        {state.message && !state.ok ? (
          <p className={styles.feedbackError} role="alert">
            {state.message}
          </p>
        ) : null}
      </form>
    </section>
  );
}
