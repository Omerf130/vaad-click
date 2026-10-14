"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/Button/Button";
import {
  createBuildingFormAction,
  type AdminBuildingActionState,
} from "@/modules/buildings/actions/admin-building.actions";
import styles from "@/modules/users/ui/AdminUsers.module.scss";

const initial: AdminBuildingActionState = { ok: false };

export function BuildingCreateForm() {
  const [state, action, pending] = useActionState(createBuildingFormAction, initial);
  const showException = state.code === "DUPLICATE_ADDRESS";

  return (
    <form action={action} className={styles.detailCard}>
      <div className={styles.filters} style={{ marginBottom: 0, gridTemplateColumns: "1fr" }}>
        <div className={styles.field}>
          <label className={styles.label} htmlFor="displayName">שם תצוגה</label>
          <input id="displayName" name="displayName" className={styles.input} required maxLength={200} />
        </div>
        <div className={styles.field}>
          <label className={styles.label} htmlFor="city">עיר</label>
          <input id="city" name="city" className={styles.input} required maxLength={120} />
        </div>
        <div className={styles.field}>
          <label className={styles.label} htmlFor="street">רחוב</label>
          <input id="street" name="street" className={styles.input} required maxLength={200} />
        </div>
        <div className={styles.field}>
          <label className={styles.label} htmlFor="houseNumber">מספר בית</label>
          <input id="houseNumber" name="houseNumber" className={styles.input} required maxLength={32} />
        </div>
        <div className={styles.field}>
          <label className={styles.label} htmlFor="postalCode">מיקוד (אופציונלי)</label>
          <input id="postalCode" name="postalCode" className={styles.input} maxLength={16} />
        </div>
        <div className={styles.field}>
          <label className={styles.label} htmlFor="unitCount">מספר יחידות (אופציונלי)</label>
          <input id="unitCount" name="unitCount" type="number" min={0} className={styles.input} />
        </div>
        <div className={styles.field}>
          <label className={styles.label} htmlFor="averageMonthlyVaadFeeMinor">דמי ועד חודשיים ממוצעים (אגורות, אופציונלי)</label>
          <input id="averageMonthlyVaadFeeMinor" name="averageMonthlyVaadFeeMinor" type="number" min={0} className={styles.input} />
        </div>
        {showException ? (
          <div className={styles.field}>
            <label className={styles.label} htmlFor="duplicateAddressExceptionReason">
              נימוק חריג כתובת (נדרש כאשר הכתובת כבר קיימת)
            </label>
            <textarea
              id="duplicateAddressExceptionReason"
              name="duplicateAddressExceptionReason"
              className={styles.input}
              rows={3}
              minLength={3}
              maxLength={500}
            />
          </div>
        ) : null}
      </div>
      {state.message && !state.ok ? (
        <p className={styles.feedbackError} role="alert">{state.message}</p>
      ) : null}
      <div className={styles.reviewActions}>
        <Button type="submit" variant="primary" disabled={pending}>
          יצירת בניין
        </Button>
      </div>
    </form>
  );
}
