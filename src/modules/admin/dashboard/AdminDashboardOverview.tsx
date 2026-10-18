import Link from "next/link";

import { ButtonLink } from "@/components/ui/Button/ButtonLink";
import { StatusBadge } from "@/components/ui/StatusBadge/StatusBadge";
import { AdminActivityTimeline } from "@/modules/admin/components/AdminActivityTimeline";
import { AdminEmptyState } from "@/modules/admin/components/AdminEmptyState";
import type {
  AdminDashboardStats,
  PendingRegistrationPreview,
} from "@/modules/admin/dashboard/admin-dashboard-stats.service";
import type { AdminActivityEntry } from "@/modules/admin/services/admin-activity.service";
import type {
  AdminAttentionItem,
  AdminOperationalCounts,
} from "@/modules/admin/services/admin-dashboard-queues.service";
import styles from "@/modules/admin/dashboard/admin-dashboard.module.scss";
import { adminBuildingVerificationFilter } from "@/modules/buildings/validation/admin-building-list.schema";
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
  operational: AdminOperationalCounts;
  attentionItems: AdminAttentionItem[];
  recentActivity: AdminActivityEntry[];
  pendingPreview: PendingRegistrationPreview[];
  financial: FinancialSnapshot;
  productionBlocked: boolean;
};

export function AdminDashboardOverview({
  stats,
  operational,
  attentionItems,
  recentActivity,
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
        <article className={[styles.kpiCard, operational.debtCasesAwaitingReview > 0 ? styles.kpiHighlight : ""].filter(Boolean).join(" ")}>
          <p className={styles.kpiLabel}>תיקים לבדיקה</p>
          <p className={styles.kpiValue}>{operational.debtCasesAwaitingReview}</p>
          <p className={styles.kpiHint}>ממתינים לעורך דין</p>
        </article>
        <article className={[styles.kpiCard, stats.pendingApprovals > 0 ? styles.kpiHighlight : ""].filter(Boolean).join(" ")}>
          <p className={styles.kpiLabel}>אישורי חשבון</p>
          <p className={styles.kpiValue}>{stats.pendingApprovals}</p>
          <p className={styles.kpiHint}>הרשמות ממתינות</p>
        </article>
        <article className={[styles.kpiCard, operational.buildingsPendingVerification > 0 ? styles.kpiHighlight : ""].filter(Boolean).join(" ")}>
          <p className={styles.kpiLabel}>בניינים לא מאומתים</p>
          <p className={styles.kpiValue}>{operational.buildingsPendingVerification}</p>
          <p className={styles.kpiHint}>אימות משפטי טרם הושלם</p>
        </article>
        <article className={styles.kpiCard}>
          <p className={styles.kpiLabel}>בניינים פעילים</p>
          <p className={styles.kpiValue}>{stats.activeBuildings}</p>
          <p className={styles.kpiHint}>{stats.managementCompanies} חברות ניהול</p>
        </article>
      </section>

      <section className={styles.panel} aria-labelledby="attention-heading">
        <div className={styles.panelHeader}>
          <div>
            <h2 id="attention-heading" className={styles.panelTitle}>
              דורש טיפול
            </h2>
            <p className={styles.panelSubtitle}>
              משתמשים, תיקי חוב ובניינים שדורשים פעולה במשרד — קישורים ישירים לתהליך הרלוונטי.
            </p>
          </div>
        </div>
        {attentionItems.length === 0 ? (
          <AdminEmptyState
            title="אין פריטים דחופים"
            description="התור ריק כרגע. בדקו שוב מאוחר יותר או עברו לתפריט הצד."
          />
        ) : (
          <ul className={styles.attentionList}>
            {attentionItems.map((item) => (
              <li key={item.id} className={styles.attentionItem}>
                <div className={styles.pendingMain}>
                  <Link href={item.href} className={styles.pendingName}>
                    {item.titleHe}
                  </Link>
                  <p className={styles.pendingMeta}>{item.metaHe}</p>
                </div>
                <StatusBadge label={item.statusHe} variant="warning" />
              </li>
            ))}
          </ul>
        )}
      </section>

      <div className={styles.columns}>
        <section className={styles.panel} aria-labelledby="recent-activity-heading">
          <h2 id="recent-activity-heading" className={styles.panelTitle}>
            פעילות אחרונה
          </h2>
          <AdminActivityTimeline items={recentActivity} />
        </section>

        <section className={styles.panel} aria-labelledby="quick-actions-heading">
          <h2 id="quick-actions-heading" className={styles.panelTitle}>
            ניווט מהיר
          </h2>
          <ul className={styles.actionList}>
            <li>
              <ButtonLink href="/app/admin/debt-cases" variant="primary" size="sm">
                תור תיקי חוב
                {operational.debtCasesAwaitingReview > 0
                  ? ` (${operational.debtCasesAwaitingReview})`
                  : ""}
              </ButtonLink>
            </li>
            <li>
              <ButtonLink href="/app/admin/users?view=pending" variant="secondary" size="sm">
                אישורי הרשמה
              </ButtonLink>
            </li>
            <li>
              <ButtonLink
                href={`/app/admin/buildings?verification=${adminBuildingVerificationFilter.PENDING}`}
                variant="secondary"
                size="sm"
              >
                בניינים לא מאומתים
              </ButtonLink>
            </li>
            <li>
              <ButtonLink href="/app/admin/buildings" variant="secondary" size="sm">
                ניהול בניינים
              </ButtonLink>
            </li>
            <li>
              <ButtonLink href="/app/admin/warning-letter-templates" variant="secondary" size="sm">
                תבניות מכתב אזהרה
              </ButtonLink>
            </li>
            {operational.casesApprovedForLetterPrep > 0 ? (
              <li>
                <ButtonLink
                  href="/app/admin/debt-cases?lawyerReviewStatus=approved_for_letter_prep"
                  variant="secondary"
                  size="sm"
                >
                  תיקים בהכנת מכתב ({operational.casesApprovedForLetterPrep})
                </ButtonLink>
              </li>
            ) : null}
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
                  <p className={styles.pendingMeta}>{formatAdminUserDateTime(user.createdAt)}</p>
                </div>
                <StatusBadge label="ממתין לאישור" variant="warning" />
              </li>
            ))}
          </ul>
        )}
      </section>

      <p className={styles.footerLink}>
        <Link href="/app">חזרה לאזור המחובר הכללי</Link>
        {" · "}
        <span className={styles.pendingMeta}>
          {stats.registeredUsers} משתמשים תפעוליים רשומים · {operational.debtCasesReturned} תיקים
          הוחזרו להשלמה
        </span>
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
