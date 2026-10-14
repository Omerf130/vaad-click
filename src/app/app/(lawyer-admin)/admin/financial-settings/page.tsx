import { AdminPageFrame } from "@/modules/admin/components/AdminPageFrame";
import { FinancialSettingsAdmin } from "@/modules/financial-settings/ui/FinancialSettingsAdmin";
import {
  mapDraftDocumentToViewModel,
  mapPublishedToSummary,
  partitionPublishedVersions,
} from "@/modules/financial-settings/presentation/financial-settings-view-model";
import {
  getCurrentFinancialSettingsDraft,
  getPublishedFinancialSettingsHistory,
} from "@/modules/financial-settings/services/financial-settings-query.service";
import { requireLawyerAdminPortal } from "@/shared/auth/require-access";
import { todayJerusalemIso } from "@/shared/time/jerusalem-calendar";

export default async function FinancialSettingsAdminPage() {
  const context = await requireLawyerAdminPortal();
  const asOf = new Date();
  const published = await getPublishedFinancialSettingsHistory({ context });
  const draft = await getCurrentFinancialSettingsDraft({ context });
  const { applicable, future, historical } = partitionPublishedVersions(published, asOf);

  const draftView = draft
    ? mapDraftDocumentToViewModel({
        draft: {
          settingsVersionId: draft.settingsVersionId,
          revision: draft.revision,
          currency: draft.currency,
          amountsMonetaryBasis: draft.amountsMonetaryBasis,
          amounts: draft.amounts ?? undefined,
          vatSchedule: draft.vatSchedule ?? [],
          escalation: {
            recoveryFeeRateBasisPoints:
              draft.escalation?.recoveryFeeRateBasisPoints ?? undefined,
          },
          platformFees: draft.platformFees
            ? {
                trustAccountProcessingFeeBasisPoints:
                  draft.platformFees.trustAccountProcessingFeeBasisPoints ?? undefined,
                committeeTransferFeeBasisPoints:
                  draft.platformFees.committeeTransferFeeBasisPoints ?? undefined,
              }
            : undefined,
          notesInternal: draft.notesInternal,
          provenance: draft.provenance,
        },
        publishedCount: published.length,
      })
    : null;

  return (
    <AdminPageFrame
      title="הגדרות כספיות"
      subtitle="עריכת טיוטה, שמירה ופרסום גרסאות — ללא חיוב אוטומטי."
    >
      <FinancialSettingsAdmin
        applicable={applicable ? mapPublishedToSummary(applicable) : null}
        futureVersions={future}
        historicalVersions={historical}
        draft={draftView}
        minEffectiveDateIso={todayJerusalemIso(asOf)}
      />
    </AdminPageFrame>
  );
}
