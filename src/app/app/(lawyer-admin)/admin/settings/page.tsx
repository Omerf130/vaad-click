import { ButtonLink } from "@/components/ui/Button/ButtonLink";
import { AdminModuleCard } from "@/modules/admin/components/AdminModuleCard";
import { AdminPageFrame } from "@/modules/admin/components/AdminPageFrame";
import { requireLawyerAdminPortal } from "@/shared/auth/require-access";

export default async function AdminSettingsHubPage() {
  await requireLawyerAdminPortal();

  return (
    <AdminPageFrame
      title="הגדרות"
      subtitle="מרכז הגדרות המערכת. רק מודולים שהושקו זמינים לעריכה."
    >
      <AdminModuleCard
        title="הגדרות כספיות"
        description={'ניהול גרסאות תעריפים, מע"מ ופרסום הגדרות כספיות גלובליות.'}
        footer={
          <ButtonLink href="/app/admin/financial-settings" variant="primary" size="sm">
            פתיחת הגדרות כספיות
          </ButtonLink>
        }
      />
    </AdminPageFrame>
  );
}
