import Link from "next/link";

import { ButtonLink } from "@/components/ui/Button/ButtonLink";
import { AdminModuleCard } from "@/modules/admin/components/AdminModuleCard";
import { AdminPageFrame } from "@/modules/admin/components/AdminPageFrame";
import styles from "@/modules/admin/dashboard/admin-dashboard.module.scss";
import { ADMIN_NAV_ITEMS } from "@/modules/admin/navigation/admin-nav-config";
import { SessionAuthStage } from "@/modules/auth/domain/session-types";
import {
  getCurrentFinancialSettingsDraft,
  getPublishedFinancialSettingsHistory,
  resolveApplicableFinancialSettingsVersion,
} from "@/modules/financial-settings/services/financial-settings-query.service";
import { requireLawyerAdminPortal } from "@/shared/auth/require-access";
import { isProduction } from "@/shared/config/env.server";
import { jerusalemIsoDateFromInstant } from "@/shared/time/jerusalem-calendar";

export default async function LawyerAdminDashboardPage() {
  const context = await requireLawyerAdminPortal();
  const asOf = new Date();

  const [published, draft, applicable] = await Promise.all([
    getPublishedFinancialSettingsHistory({ context }),
    getCurrentFinancialSettingsDraft({ context }),
    resolveApplicableFinancialSettingsVersion({ context, asOf }),
  ]);

  const productionBlocked =
    isProduction() && context.session.authStage !== SessionAuthStage.MFA_COMPLETE;

  const moduleCards = ADMIN_NAV_ITEMS.filter((item) => item.id !== "overview");

  return (
    <AdminPageFrame
      title="סקירה כללית"
      subtitle="מרכז הניהול של משרד עורכי הדין. מודולים שטרם הושקו מוצגים כבלתי זמינים — ללא נתונים מדומים."
    >
      {productionBlocked ? (
        <p className={styles.notice} role="alert">
          גישה לתהליכים משפטיים רגישים ב-production חסומה עד להשלמת MFA (דרישת CP0).
        </p>
      ) : null}

      <div className={styles.grid}>
        {moduleCards.map((item) => {
          if (item.id === "settings") {
            return (
              <AdminModuleCard
                key={item.id}
                title={item.labelHe}
                description="הגדרות מערכת, כולל תעריפים וגרסאות כספיות."
                footer={
                  <div>
                    <ul className={styles.summaryList}>
                      <li>
                        גרסאות שפורסמו: {published.length}
                        {applicable
                          ? ` · בתוקף: גרסה ${applicable.versionNumber} (${jerusalemIsoDateFromInstant(applicable.effectiveFrom)})`
                          : published.length > 0
                            ? " · אין גרסה בתוקף כרגע (ייתכן תאריך עתידי)"
                            : ""}
                      </li>
                      <li>{draft ? "טיוטה פתוחה לעריכה" : "אין טיוטה פתוחה"}</li>
                    </ul>
                    <p className={styles.settingsActions}>
                      <ButtonLink href="/app/admin/settings" variant="primary" size="sm">
                        כניסה להגדרות
                      </ButtonLink>
                    </p>
                  </div>
                }
              />
            );
          }

          if (item.status === "planned") {
            return (
              <AdminModuleCard
                key={item.id}
                title={item.labelHe}
                description={item.unavailableReasonHe ?? "יושק ב-checkpoint עתידי"}
                unavailable
              />
            );
          }

          return null;
        })}
      </div>

      <p>
        <Link href="/app">חזרה לאזור המחובר הכללי</Link>
      </p>
    </AdminPageFrame>
  );
}
