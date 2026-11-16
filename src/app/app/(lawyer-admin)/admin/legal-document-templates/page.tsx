import { AdminPageFrame } from "@/modules/admin/components/AdminPageFrame";
import { LegalDocumentTemplatesWorkspace } from "@/modules/legal-document-templates/ui/LegalDocumentTemplatesWorkspace";
import { loadLegalDocumentTemplateWorkspace } from "@/modules/legal-document-templates/services/legal-document-template.service";
import { requireLawyerAdminPortal } from "@/shared/auth/require-access";

export default async function AdminLegalDocumentTemplatesPage() {
  const context = await requireLawyerAdminPortal();
  const categories = await loadLegalDocumentTemplateWorkspace(context);

  return (
    <AdminPageFrame
      title="מסמכים משפטיים"
      subtitle="ניהול טיוטות, גרסאות, אישור ופרסום של תבניות ייפוי כוח, הסכם שכר טרחה, הצהרה וכתב תביעה (מבנה) — ללא מסמכים לבניין."
    >
      <LegalDocumentTemplatesWorkspace categories={categories} />
    </AdminPageFrame>
  );
}
