import type { WarningLetterPlatformFeePaymentPreference } from "@/modules/debt-cases/domain/warning-letter-platform-fee-payment-preference";
import { DebtCaseIntakeClientForm } from "@/modules/debt-cases/ui/DebtCaseIntakeClientForm";
import {
  getDebtCaseIntakeDraft,
  loadIntakePortalContext,
} from "@/modules/debt-cases/services/debt-case-intake.service";
import { OperatorPortalPageFrame } from "@/modules/portal/ui/OperatorPortalPageFrame";
import { getDocumentStorageUiState } from "@/modules/document-assets/services/document-asset.service";
import { requireOperationalPortalAccess } from "@/shared/auth/require-access";
import { notFound } from "next/navigation";

type Props = { params: Promise<{ intakeDraftId: string }> };

export default async function EditDebtCaseIntakePage({ params }: Props) {
  const { intakeDraftId } = await params;
  const context = await requireOperationalPortalAccess();
  let draft;
  try {
    draft = await getDebtCaseIntakeDraft({ context, intakeDraftId });
  } catch {
    notFound();
  }

  const portalContext = await loadIntakePortalContext(context);
  const storageState = getDocumentStorageUiState();
  const snapshot = draft.buildingSnapshot as {
    displayName?: string;
    city?: string;
    street?: string;
    houseNumber?: string;
    postalCode?: string | null;
  };

  return (
    <OperatorPortalPageFrame
      title="פתיחת תיק חייב חדש"
      subtitle="עריכת טיוטת קליטה"
      breadcrumbs={[
        { label: "לוח בקרה", href: "/app" },
        { label: "תיק חייב חדש", href: "/app/debt-cases/new" },
        { label: "טיוטה", href: `/app/debt-cases/intake/${intakeDraftId}` },
      ]}
    >
      <DebtCaseIntakeClientForm
        role={context.user.role}
        repAssignedBuildingId={portalContext.repAssignedBuildingId}
        accessibleBuildings={portalContext.accessibleBuildings}
        intakeDraftId={draft.intakeDraftId}
        initialRevision={draft.revision}
        initialBuildingMode={draft.buildingSelectionMode as "new" | "existing"}
        initialExistingBuildingId={draft.existingBuildingId}
        initialBuilding={{
          displayName: snapshot.displayName ?? "",
          city: snapshot.city ?? "",
          street: snapshot.street ?? "",
          houseNumber: snapshot.houseNumber ?? "",
          postalCode: snapshot.postalCode ?? "",
        }}
        initialCaseDraft={(draft.caseDraftJson as Record<string, unknown>) ?? {}}
        initialPlatformFeePreference={
          (draft.platformFeePreference as WarningLetterPlatformFeePaymentPreference | null) ?? null
        }
        storageState={storageState}
      />
    </OperatorPortalPageFrame>
  );
}
