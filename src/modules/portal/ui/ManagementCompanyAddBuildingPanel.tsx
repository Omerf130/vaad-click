"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/Button/Button";
import {
  managementCompanyCreateBuildingFormAction,
  type PortalBuildingActionState,
} from "@/modules/buildings/actions/portal-building.actions";
import styles from "@/modules/portal/ui/OperatorPortalDashboard.module.scss";

const initial: PortalBuildingActionState = { ok: false };

type Props = {
  /** When true, form is expanded by default (e.g. empty building list). */
  defaultOpen?: boolean;
  /** Hide outer section heading when wrapped in a parent disclosure. */
  hideSectionTitle?: boolean;
};

export function ManagementCompanyAddBuildingPanel({
  defaultOpen = false,
  hideSectionTitle = false,
}: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(defaultOpen);
  const [state, formAction, pending] = useActionState(
    managementCompanyCreateBuildingFormAction,
    initial,
  );

  useEffect(() => {
    if (state.ok) {
      router.refresh();
    }
  }, [state.ok, router]);

  const titleId = hideSectionTitle ? undefined : "mc-add-building-title";

  return (
    <section
      className={styles.addBuildingSection}
      aria-labelledby={titleId}
    >
      <div className={styles.addBuildingHeader}>
        <div>
          {hideSectionTitle ? null : (
            <h2 id="mc-add-building-title" className={styles.sectionTitle}>
              ניהול בניינים
            </h2>
          )}
          <p className={styles.sectionHint}>
            הוספת בניין משייכת אותו לחברת הניהול שלכם. הבניין אינו מאומת משפטית עד שמשרד עורך הדין
            יסיים את תהליך האימות — הלקוח המשפטי הוא ועד הבית.
          </p>
        </div>
        {!open ? (
          <Button type="button" onClick={() => setOpen(true)}>
            הוספת בניין
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
