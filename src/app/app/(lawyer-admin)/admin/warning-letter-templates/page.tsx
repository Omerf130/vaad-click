import { AdminPageFrame } from "@/modules/admin/components/AdminPageFrame";
import { listWarningLetterTemplateVariantCatalogWithApprovalStatus } from "@/modules/warning-letters/services/warning-letter-template-variant-approval.service";
import { WarningLetterTemplateVariantApprovalPanel } from "@/modules/warning-letters/ui/WarningLetterTemplateVariantApprovalPanel";
import { requireLawyerAdminPortal } from "@/shared/auth/require-access";

export default async function AdminWarningLetterTemplatesPage() {
  await requireLawyerAdminPortal();
  const rows = await listWarningLetterTemplateVariantCatalogWithApprovalStatus();

  return (
    <AdminPageFrame
      title="אישור ניסוחי תבנית — מכתבי התראה"
      subtitle="אישור גלובלי של גרסאות ניסוח משפטי. שינוי ניסוח במערכת ידרוש גרסה ואישור מחדש."
    >
      <WarningLetterTemplateVariantApprovalPanel rows={rows} />
    </AdminPageFrame>
  );
}
