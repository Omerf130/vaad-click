import { StatusBadge } from "@/components/ui/StatusBadge/StatusBadge";
import { formatAdminUserDateTime } from "@/modules/users/presentation/format-admin-user-date";
import {
  accountStatusBadgeVariant,
  formatAccountStatusHe,
  formatAdminUserRoleHe,
} from "@/modules/users/presentation/admin-user-labels.he";
import type { AdminUserDetail } from "@/modules/users/services/admin-user-query.service";
import { UserAccountReviewPanel } from "@/modules/users/ui/UserAccountReviewPanel";
import styles from "@/modules/users/ui/AdminUsers.module.scss";

type AdminUserDetailSectionsProps = {
  user: AdminUserDetail;
};

export function AdminUserDetailSections({ user }: AdminUserDetailSectionsProps) {
  return (
    <div className={styles.detailGrid}>
      <section className={styles.detailCard} aria-labelledby="user-detail-heading">
        <h2 id="user-detail-heading" className={styles.workspaceTitle}>
          פרטי חשבון
        </h2>
        <dl className={styles.definitionList}>
          <div className={styles.definitionRow}>
            <dt className={styles.definitionTerm}>שם מלא</dt>
            <dd className={styles.definitionValue}>{user.fullName}</dd>
          </div>
          <div className={styles.definitionRow}>
            <dt className={styles.definitionTerm}>דוא״ל</dt>
            <dd className={styles.definitionValue}>{user.email}</dd>
          </div>
          <div className={styles.definitionRow}>
            <dt className={styles.definitionTerm}>תפקיד</dt>
            <dd className={styles.definitionValue}>{formatAdminUserRoleHe(user.role)}</dd>
          </div>
          <div className={styles.definitionRow}>
            <dt className={styles.definitionTerm}>סטטוס</dt>
            <dd className={styles.definitionValue}>
              <StatusBadge
                label={formatAccountStatusHe(user.accountStatus)}
                variant={accountStatusBadgeVariant(user.accountStatus)}
              />
            </dd>
          </div>
          <div className={styles.definitionRow}>
            <dt className={styles.definitionTerm}>תאריך הרשמה</dt>
            <dd className={styles.definitionValue}>{formatAdminUserDateTime(user.createdAt)}</dd>
          </div>
          <div className={styles.definitionRow}>
            <dt className={styles.definitionTerm}>התחברות אחרונה</dt>
            <dd className={styles.definitionValue}>
              {user.lastSessionAt
                ? formatAdminUserDateTime(user.lastSessionAt)
                : "אין עדיין התחברות מתועדת"}
            </dd>
          </div>
        </dl>
      </section>

      <section className={styles.detailCard} aria-labelledby="user-assignment-heading">
        <h2 id="user-assignment-heading" className={styles.workspaceTitle}>
          שיוך ארגוני
        </h2>
        {user.assignment.kind === "none" ? (
          <p className={styles.metaLine}>אין שיוך לבניין או לחברת ניהול.</p>
        ) : null}
        {user.assignment.kind === "building_rep" ? (
          <p className={styles.definitionValue}>
            נציג בניין: {user.assignment.buildingDisplayName} ({user.assignment.buildingId})
          </p>
        ) : null}
        {user.assignment.kind === "management_company" ? (
          <div>
            <p className={styles.definitionValue}>
              {user.assignment.companyDisplayName} · {user.assignment.buildingCount} בניינים
              משויכים
            </p>
            {user.assignment.buildingSummaries.length > 0 ? (
              <ul className={styles.metaLine}>
                {user.assignment.buildingSummaries.map((building) => (
                  <li key={building.buildingId}>{building.displayName}</li>
                ))}
              </ul>
            ) : null}
          </div>
        ) : null}
      </section>

      <section className={styles.detailCard} aria-labelledby="user-review-heading">
        <h2 id="user-review-heading" className={styles.workspaceTitle}>
          אישור חשבון
        </h2>
        <UserAccountReviewPanel userId={user.id} accountStatus={user.accountStatus} />
      </section>
    </div>
  );
}
