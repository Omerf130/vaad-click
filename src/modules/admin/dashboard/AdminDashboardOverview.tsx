import Link from "next/link";

import { ButtonLink } from "@/components/ui/Button/ButtonLink";
import { StatusBadge } from "@/components/ui/StatusBadge/StatusBadge";
import { AdminEmptyState } from "@/modules/admin/components/AdminEmptyState";
import type {
  AdminDashboardStats,
  PendingRegistrationPreview,
} from "@/modules/admin/dashboard/admin-dashboard-stats.service";
import styles from "@/modules/admin/dashboard/admin-dashboard.module.scss";
import { formatAdminUserRoleHe } from "@/modules/users/presentation/admin-user-labels.he";
import { formatAdminUserDateTime } from "@/modules/users/presentation/format-admin-user-date";
import { jerusalemIsoDateFromInstant } from "@/shared/time/jerusalem-calendar";

type FinancialSnapshot = {
  publishedCount: number;
  hasDraft: boolean;
  applicableVersionLabel: string | null;
};

type AdminDashboardOverviewProps = {
  stats: AdminDashboardStats;
  pendingPreview: PendingRegistrationPreview[];
  financial: FinancialSnapshot;
  productionBlocked: boolean;
};

export function AdminDashboardOverview({
  stats,
  pendingPreview,
  financial,
  productionBlocked,
}: AdminDashboardOverviewProps) {
  return (
    <div className={styles.dashboard}>
      {productionBlocked ? (
        <p className={styles.notice} role="alert">
          גישה לתהליכים משפטיים רגישים ב-production חסומה עד להשלמת MFA (דרישת CP0).
        </p>
      ) : null}

      <section className={styles.kpiRow} aria-label="מדדים עיקריים">
        <article className={styles.kpiCard}>
          <p className={styles.kpiLabel}>משתמשים רשומים</p>
          <p className={styles.kpiValue}>{stats.registeredUsers}</p>
          <p className={styles.kpiHint}>נציגות וחברות ניהול</p>
        </article>
        <article className={[styles.kpiCard, stats.pendingApprovals > 0 ? styles.kpiHighlight : ""].filter(Boolean).join(" ")}>
          <p className={styles.kpiLabel}>ממתינים לאישור</p>
          <p className={styles.kpiValue}>{stats.pendingApprovals}</p>
          <p className={styles.kpiHint}>
            {stats.pendingApprovals > 0 ? "דורש טיפול מנהל המשרד" : "אין תור פתוח"}
          </p>
        </article>
        <article className={styles.kpiCard}>
          <p className={styles.kpiLabel}>בניינים פעילים</p>
          <p className={styles.kpiValue}>{stats.activeBuildings}</p>
          <p className={styles.kpiHint}>רשומים במערכת</p>
        </article>
        <article className={styles.kpiCard}>
          <p className={styles.kpiLabel}>חברות ניהול</p>
          <p className={styles.kpiValue}>{stats.managementCompanies}</p>
          <p className={styles.kpiHint}>ישויות ארגוניות</p>
        </article>
      </section>

      <div className={styles.columns}>
        <section className={styles.panel} aria-labelledby="pending-requests-heading">
          <div className={styles.panelHeader}>
            <div>
              <h2 id="pending-requests-heading" className={styles.panelTitle}>
                בקשות הרשמה ממתינות
              </h2>
              <p className={styles.panelSubtitle}>
                אישור מאפשר התחברות בלבד — שיוך לבניין יבוצע בנפרד.
              </p>
            </div>
            <ButtonLink href="/app/admin/users?view=pending" variant="secondary" size="sm">
              כל הבקשות
            </ButtonLink>
          </div>

          {pendingPreview.length === 0 ? (
            <AdminEmptyState
              title="אין בקשות ממתינות"
              description="הרשמות חדשות יופיעו כאן לצורך אישור או דחייה."
              actions={
                <ButtonLink href="/app/admin/users" variant="ghost" size="sm">
                  ניהול משתמשים
                </ButtonLink>
              }
            />
          ) : (
            <ul className={styles.pendingList}>
              {pendingPreview.map((user) => (
                <li key={user.id} className={styles.pendingItem}>
                  <div className={styles.pendingMain}>
                    <Link href={`/app/admin/users/${user.id}`} className={styles.pendingName}>
                      {user.fullName}
                    </Link>
                    <p className={styles.pendingMeta}>
                      {user.email} · {formatAdminUserRoleHe(user.role)}
                    </p>
                    <p className={styles.pendingMeta}>
                      {formatAdminUserDateTime(user.createdAt)}
                    </p>
                  </div>
                  <StatusBadge label="ממתין לאישור" variant="warning" />
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className={styles.panel} aria-labelledby="quick-actions-heading">
          <h2 id="quick-actions-heading" className={styles.panelTitle}>
            פעולות מהירות
          </h2>
          <ul className={styles.actionList}>
            <li>
              <ButtonLink href="/app/admin/users" variant="primary" size="sm">
                ניהול משתמשים
              </ButtonLink>
            </li>
            {stats.pendingApprovals > 0 ? (
              <li>
                <ButtonLink href="/app/admin/users?view=pending" variant="secondary" size="sm">
                  תור אישור ({stats.pendingApprovals})
                </ButtonLink>
              </li>
            ) : null}
            <li>
              <ButtonLink href="/app/admin/settings" variant="secondary" size="sm">
                הגדרות מערכת
              </ButtonLink>
            </li>
            <li>
              <ButtonLink href="/app/admin/financial-settings" variant="secondary" size="sm">
                הגדרות כספיות
              </ButtonLink>
            </li>
          </ul>

          <div className={styles.financialStrip}>
            <h3 className={styles.stripTitle}>מצב הגדרות כספיות</h3>
            <ul className={styles.stripList}>
              <li>גרסאות שפורסמו: {financial.publishedCount}</li>
              <li>{financial.hasDraft ? "טיוטה פתוחה לעריכה" : "אין טיוטה פתוחה"}</li>
              {financial.applicableVersionLabel ? (
                <li>בתוקף: {financial.applicableVersionLabel}</li>
              ) : null}
            </ul>
          </div>
        </section>
      </div>

      <p className={styles.footerLink}>
        <Link href="/app">חזרה לאזור המחובר הכללי</Link>
      </p>
    </div>
  );
}

export function buildApplicableVersionLabel(input: {
  versionNumber: number;
  effectiveFrom: Date;
} | null): string | null {
  if (!input) {
    return null;
  }
  return `גרסה ${input.versionNumber} (${jerusalemIsoDateFromInstant(input.effectiveFrom)})`;
}
