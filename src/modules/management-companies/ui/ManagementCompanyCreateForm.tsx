"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/Button/Button";
import {
  createManagementCompanyFormAction,
  type AdminManagementCompanyActionState,
} from "@/modules/management-companies/actions/admin-management-company.actions";
import type { EligibleRepresentativeOption } from "@/modules/buildings/services/admin-building-query.service";
import styles from "@/modules/users/ui/AdminUsers.module.scss";

const initial: AdminManagementCompanyActionState = { ok: false };

type Props = {
  eligiblePrimaryUsers: EligibleRepresentativeOption[];
};

export function ManagementCompanyCreateForm({ eligiblePrimaryUsers }: Props) {
  const [state, action, pending] = useActionState(createManagementCompanyFormAction, initial);

  return (
    <form action={action} className={styles.detailCard}>
      <div className={styles.filters} style={{ marginBottom: 0 }}>
        <div className={styles.field}>
          <label className={styles.label} htmlFor="displayName">שם החברה</label>
          <input id="displayName" name="displayName" className={styles.input} required maxLength={200} />
        </div>
        <div className={styles.field}>
          <label className={styles.label} htmlFor="primaryUserId">משתמש ראשי (מאושר, הרשמה ציבורית)</label>
          <select id="primaryUserId" name="primaryUserId" className={styles.select} required defaultValue="">
            <option value="" disabled>בחרו משתמש</option>
            {eligiblePrimaryUsers.map((user) => (
              <option key={user.id} value={user.id}>
                {user.fullName} · {user.email}
              </option>
            ))}
          </select>
        </div>
        <div className={styles.field}>
          <label className={styles.label} htmlFor="companyRegistrationNumber">מספר רישום (אופציונלי)</label>
          <input id="companyRegistrationNumber" name="companyRegistrationNumber" className={styles.input} maxLength={32} />
        </div>
        <div className={styles.field}>
          <label className={styles.label} htmlFor="contactEmail">דוא״ל (אופציונלי)</label>
          <input id="contactEmail" name="contactEmail" type="email" className={styles.input} />
        </div>
        <div className={styles.field}>
          <label className={styles.label} htmlFor="contactPhone">טלפון (אופציונלי)</label>
          <input id="contactPhone" name="contactPhone" className={styles.input} maxLength={32} />
        </div>
      </div>
      {eligiblePrimaryUsers.length === 0 ? (
        <p className={styles.notice}>אין משתמשי חברת ניהול מאושרים ללא שיוך. אשרו הרשמה ב«משתמשים» תחילה.</p>
      ) : null}
      {state.message && !state.ok ? (
        <p className={styles.feedbackError} role="alert">{state.message}</p>
      ) : null}
      <div className={styles.reviewActions}>
        <Button type="submit" variant="primary" disabled={pending || eligiblePrimaryUsers.length === 0}>
          יצירת חברה
        </Button>
      </div>
    </form>
  );
}
