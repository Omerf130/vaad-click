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
      <AdminModuleCard
        title="ניסוחי מכתב התראה"
        description="אישור גרסאות ניסוח משפטי גלובלי (לא אישור ניסוח לתיק בודד)."
        footer={
          <ButtonLink href="/app/admin/warning-letter-templates" variant="secondary" size="sm">
            פתיחת אישורי תבנית
          </ButtonLink>
        }
      />
      <AdminModuleCard
        title="מסמכים משפטיים"
        description="טיוטות, גרסאות, אישור ופרסום של תבניות ייפוי כוח, הסכם שכר טרחה והצהרה."
        footer={
          <ButtonLink href="/app/admin/legal-document-templates" variant="secondary" size="sm">
            פתיחת מסמכים משפטיים
          </ButtonLink>
        }
      />
    </AdminPageFrame>
  );
}
