import { AdminPageFrame } from "@/modules/admin/components/AdminPageFrame";
import {
  AdminDashboardOverview,
  buildApplicableVersionLabel,
} from "@/modules/admin/dashboard/AdminDashboardOverview";
import {
  getAdminDashboardStats,
  listPendingRegistrationPreviews,
} from "@/modules/admin/dashboard/admin-dashboard-stats.service";
import { loadAdminDashboardRecentActivity } from "@/modules/admin/services/admin-activity.service";
import {
  getAdminOperationalCounts,
  listAdminAttentionItems,
} from "@/modules/admin/services/admin-dashboard-queues.service";
import { SessionAuthStage } from "@/modules/auth/domain/session-types";
import {
  getCurrentFinancialSettingsDraft,
  getPublishedFinancialSettingsHistory,
  resolveApplicableFinancialSettingsVersion,
} from "@/modules/financial-settings/services/financial-settings-query.service";
import { sessionGrantsAccess } from "@/shared/auth/access-policy";
import { requireLawyerAdminPortal } from "@/shared/auth/require-access";
import { isProduction } from "@/shared/config/env.server";

export default async function LawyerAdminDashboardPage() {
  const context = await requireLawyerAdminPortal();
  const asOf = new Date();

  const [stats, operational, attentionItems, recentActivity, pendingPreview, published, draft, applicable] =
    await Promise.all([
      getAdminDashboardStats(context),
      getAdminOperationalCounts(context),
      listAdminAttentionItems(context),
      loadAdminDashboardRecentActivity({ context }),
      listPendingRegistrationPreviews(context),
      getPublishedFinancialSettingsHistory({ context }),
      getCurrentFinancialSettingsDraft({ context }),
      resolveApplicableFinancialSettingsVersion({ context, asOf }),
    ]);

  const productionBlocked =
    isProduction() &&
    context.session.authStage !== SessionAuthStage.MFA_COMPLETE &&
    !sessionGrantsAccess({
      session: context.session,
      userRole: context.user.role,
      surface: "development_portal",
      isProductionEnvironment: true,
      userId: context.user.id,
      accountStatus: context.user.accountStatus,
    });

  return (
    <AdminPageFrame
      title="מרכז ניהול המשרד"
      subtitle="תמונת מצב תפעולית — נתונים חיים מהמערכת. אין כאן מודולים עתידיים; ניהול מלא דרך תפריט הצד."
    >
      <AdminDashboardOverview
        stats={stats}
        operational={operational}
        attentionItems={attentionItems}
        recentActivity={recentActivity}
        pendingPreview={pendingPreview}
        productionBlocked={productionBlocked}
        financial={{
          publishedCount: published.length,
          hasDraft: Boolean(draft),
          applicableVersionLabel: buildApplicableVersionLabel(
            applicable
              ? {
                  versionNumber: applicable.versionNumber,
                  effectiveFrom: applicable.effectiveFrom,
                }
              : null,
          ),
        }}
      />
    </AdminPageFrame>
  );
}
