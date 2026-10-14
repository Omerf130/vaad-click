"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/Button/Button";
import {
  updateManagementCompanyFormAction,
  type AdminManagementCompanyActionState,
} from "@/modules/management-companies/actions/admin-management-company.actions";
import type { AdminManagementCompanyDetail } from "@/modules/management-companies/services/admin-management-company-query.service";
import styles from "@/modules/users/ui/AdminUsers.module.scss";

const initial: AdminManagementCompanyActionState = { ok: false };

type Props = {
  company: AdminManagementCompanyDetail;
};

export function ManagementCompanyDetailForm({ company }: Props) {
  const [state, action, pending] = useActionState(updateManagementCompanyFormAction, initial);

  return (
    <section className={styles.detailCard}>
      <h2 className={styles.workspaceTitle}>פרטי חברה</h2>
      {company.primaryUser ? (
        <p className={styles.metaLine}>
          משתמש ראשי: {company.primaryUser.fullName} · {company.primaryUser.email}
        </p>
      ) : null}
      <p className={styles.metaLine}>סטטוס: {company.status === "active" ? "פעיל" : company.status}</p>
      <form action={action} className={styles.filters}>
        <input type="hidden" name="managementCompanyId" value={company.managementCompanyId} />
        <div className={styles.field}>
          <label className={styles.label} htmlFor="displayName">שם</label>
          <input id="displayName" name="displayName" className={styles.input} defaultValue={company.displayName} required />
        </div>
        <div className={styles.field}>
          <label className={styles.label} htmlFor="companyRegistrationNumber">מספר רישום</label>
          <input id="companyRegistrationNumber" name="companyRegistrationNumber" className={styles.input} defaultValue={company.companyRegistrationNumber ?? ""} />
        </div>
        <div className={styles.field}>
          <label className={styles.label} htmlFor="contactEmail">דוא״ל</label>
          <input id="contactEmail" name="contactEmail" type="email" className={styles.input} defaultValue={company.contactEmail ?? ""} />
        </div>
        <div className={styles.field}>
          <label className={styles.label} htmlFor="contactPhone">טלפון</label>
          <input id="contactPhone" name="contactPhone" className={styles.input} defaultValue={company.contactPhone ?? ""} />
        </div>
        <Button type="submit" variant="secondary" size="sm" disabled={pending}>שמירה</Button>
      </form>
      {state.message ? (
        <p className={state.ok ? styles.feedbackSuccess : styles.feedbackError} role="status">{state.message}</p>
      ) : null}
      <h3 className={styles.workspaceTitle}>בניינים מנוהלים</h3>
      {company.buildings.length === 0 ? (
        <p className={styles.metaLine}>אין בניינים משויכים. השיוך מתבצע מדף הבניין.</p>
      ) : (
        <ul className={styles.metaLine}>
          {company.buildings.map((b) => (
            <li key={b.buildingId}>
              <a href={`/app/admin/buildings/${b.buildingId}`}>{b.displayName}</a> · {b.city}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
