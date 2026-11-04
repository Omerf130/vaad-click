"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/Button/Button";
import {
  buildingRepresentativeCreateBuildingFormAction,
  type PortalBuildingActionState,
} from "@/modules/buildings/actions/portal-building.actions";
import styles from "@/modules/portal/ui/OperatorPortalDashboard.module.scss";

const initial: PortalBuildingActionState = { ok: false };

type Props = {
  defaultOpen?: boolean;
};

export function BuildingRepAddBuildingPanel({ defaultOpen = false }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(defaultOpen);
  const [state, formAction, pending] = useActionState(
    buildingRepresentativeCreateBuildingFormAction,
    initial,
  );

  useEffect(() => {
    if (state.ok) {
      router.refresh();
    }
  }, [state.ok, router]);

  return (
    <section className={styles.addBuildingSection} aria-labelledby="rep-add-building-title">
      <div className={styles.addBuildingHeader}>
        <div>
          <h2 id="rep-add-building-title" className={styles.sectionTitle}>
            פרטי הבניין
          </h2>
          <p className={styles.sectionHint}>
            הזינו את פרטי הבית המשותף שאתם מייצגים. לאחר השמירה תוכלו לפתוח טיוטת תיק חוב ולהגיש
            לבדיקת משרד עורך הדין.
          </p>
        </div>
        {!open ? (
          <Button type="button" onClick={() => setOpen(true)}>
            הזנת פרטי בניין
          </Button>
        ) : null}
      </div>

      {open ? (
        <form action={formAction} className={styles.addBuildingForm}>
          <div className={styles.addBuildingFields}>
            <label className={styles.searchLabel}>
              שם הבניין
              <input
                name="displayName"
                className={styles.searchInput}
                required
                maxLength={200}
                autoComplete="off"
              />
            </label>
            <label className={styles.searchLabel}>
              עיר
              <input name="city" className={styles.searchInput} required maxLength={120} />
            </label>
            <label className={styles.searchLabel}>
              רחוב
              <input name="street" className={styles.searchInput} required maxLength={200} />
            </label>
            <label className={styles.searchLabel}>
              מספר בית
              <input name="houseNumber" className={styles.searchInput} required maxLength={32} />
            </label>
            <label className={styles.searchLabel}>
              מיקוד (אופציונלי)
              <input name="postalCode" className={styles.searchInput} maxLength={16} />
            </label>
          </div>
          <div className={styles.actionsRow}>
            <Button type="submit" disabled={pending}>
              {pending ? "שומר…" : "שמירת בניין"}
            </Button>
            <Button type="button" variant="secondary" onClick={() => setOpen(false)} disabled={pending}>
              ביטול
            </Button>
          </div>
          {state.message ? (
            <p
              className={state.ok ? styles.feedbackSuccess : styles.feedbackError}
              role={state.ok ? "status" : "alert"}
            >
              {state.message}
            </p>
          ) : null}
        </form>
      ) : null}
    </section>
  );
}
