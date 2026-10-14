"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/Button/Button";
import {
  captureProposedCommitteeTermsFormAction,
  type CommitteeEngagementActionState,
} from "@/modules/committee-engagements/actions/admin-committee-engagement.actions";
import type { AdminCommitteeEngagementView } from "@/modules/committee-engagements/services/committee-engagement.service";
import { COMMITTEE_ENGAGEMENT_UI_COPY } from "@/modules/committee-engagements/presentation/engagement-messages.he";
import { publishedAmountsUseGrossInclusiveDisplay } from "@/modules/financial-settings/domain/financial-settings-amounts";
import {
  committeeTreatmentFeePrimaryDisplayMinor,
  debtorTreatmentFeePrimaryDisplayMinor,
} from "@/modules/financial-settings/domain/financial-settings-amounts";
import { FINANCIAL_SETTINGS_UI_COPY } from "@/modules/financial-settings/presentation/financial-settings-messages.he";
import {
  formatBasisPointsAsPercentDisplay,
  formatMinorUnitsAsShekels,
} from "@/shared/financial/decimal-string-parse";
import styles from "@/modules/users/ui/AdminUsers.module.scss";

type BuildingCommitteeEngagementPanelProps = {
  buildingId: string;
  engagement: AdminCommitteeEngagementView | null;
};

const initial: CommitteeEngagementActionState = { ok: false };

export function BuildingCommitteeEngagementPanel({
  buildingId,
  engagement,
}: BuildingCommitteeEngagementPanelProps) {
  const [state, action, pending] = useActionState(captureProposedCommitteeTermsFormAction, initial);

  const terms = engagement?.proposedTerms;
  const grossDisplay = terms ? publishedAmountsUseGrossInclusiveDisplay(terms.amounts) : false;

  return (
    <section className={styles.detailCard}>
      <h2 className={styles.workspaceTitle}>{COMMITTEE_ENGAGEMENT_UI_COPY.sectionTitle}</h2>
      <p className={styles.metaLine}>{COMMITTEE_ENGAGEMENT_UI_COPY.proposedDisclaimer}</p>
      <p className={styles.metaLine}>{COMMITTEE_ENGAGEMENT_UI_COPY.transfersBlocked}</p>

      {state.message ? (
        <p className={state.ok ? styles.feedbackSuccess : styles.feedbackError} role="status">
          {state.message}
        </p>
      ) : null}

      {terms ? (
        <dl className={styles.definitionList}>
          <div className={styles.definitionRow}>
            <dt className={styles.definitionTerm}>{COMMITTEE_ENGAGEMENT_UI_COPY.versionLine}</dt>
            <dd className={styles.definitionValue}>
              #{engagement!.sourceVersionNumber} · {engagement!.sourceSettingsVersionId}
            </dd>
          </div>
          <div className={styles.definitionRow}>
            <dt className={styles.definitionTerm}>{COMMITTEE_ENGAGEMENT_UI_COPY.trustFee}</dt>
            <dd className={styles.definitionValue}>
              {formatBasisPointsAsPercentDisplay(
                terms.platformFees.trustAccountProcessingFeeBasisPoints,
              )}
              %
            </dd>
          </div>
          <div className={styles.definitionRow}>
            <dt className={styles.definitionTerm}>{COMMITTEE_ENGAGEMENT_UI_COPY.transferFee}</dt>
            <dd className={styles.definitionValue}>
              {formatBasisPointsAsPercentDisplay(
                terms.platformFees.committeeTransferFeeBasisPoints,
              )}
              %
            </dd>
          </div>
          <div className={styles.definitionRow}>
            <dt className={styles.definitionTerm}>{COMMITTEE_ENGAGEMENT_UI_COPY.successFee}</dt>
            <dd className={styles.definitionValue}>
              {formatBasisPointsAsPercentDisplay(terms.escalation.recoveryFeeRateBasisPoints)}% —{" "}
              {FINANCIAL_SETTINGS_UI_COPY.escalationBaseUnresolved}
            </dd>
          </div>
          <div className={styles.definitionRow}>
            <dt className={styles.definitionTerm}>דמי טיפול — חייב</dt>
            <dd className={styles.definitionValue}>
              <strong>
                {formatMinorUnitsAsShekels(debtorTreatmentFeePrimaryDisplayMinor(terms.amounts))} ₪
              </strong>
              {grossDisplay ? (
                <span className={styles.metaLine}>
                  {" "}
                  ({FINANCIAL_SETTINGS_UI_COPY.grossPublishedAmountBadge} · נטו{" "}
                  {formatMinorUnitsAsShekels(terms.amounts.debtorTreatmentFee!.net.amountMinor)} ₪ ·
                  מע&quot;מ {formatMinorUnitsAsShekels(terms.amounts.debtorTreatmentFee!.vat.amountMinor)}{" "}
                  ₪)
                </span>
              ) : (
                <span className={styles.metaLine}>
                  {" "}
                  ({FINANCIAL_SETTINGS_UI_COPY.legacyPublishedAmountBadge})
                </span>
              )}
            </dd>
          </div>
          <div className={styles.definitionRow}>
            <dt className={styles.definitionTerm}>דמי טיפול — ועד</dt>
            <dd className={styles.definitionValue}>
              <strong>
                {formatMinorUnitsAsShekels(
                  committeeTreatmentFeePrimaryDisplayMinor(terms.amounts),
                )}{" "}
                ₪
              </strong>
              {grossDisplay ? (
                <span className={styles.metaLine}>
                  {" "}
                  ({FINANCIAL_SETTINGS_UI_COPY.grossPublishedAmountBadge} · נטו{" "}
                  {formatMinorUnitsAsShekels(
                    terms.amounts.committeeTreatmentFeeWhenDebtorWaived!.net.amountMinor,
                  )}{" "}
                  ₪ · מע&quot;מ{" "}
                  {formatMinorUnitsAsShekels(
                    terms.amounts.committeeTreatmentFeeWhenDebtorWaived!.vat.amountMinor,
                  )}{" "}
                  ₪)
                </span>
              ) : (
                <span className={styles.metaLine}>
                  {" "}
                  ({FINANCIAL_SETTINGS_UI_COPY.legacyPublishedAmountBadge})
                </span>
              )}
            </dd>
          </div>
        </dl>
      ) : (
        <p className={styles.metaLine}>{COMMITTEE_ENGAGEMENT_UI_COPY.notCaptured}</p>
      )}

      <form action={action} className={styles.filters}>
        <input type="hidden" name="buildingId" value={buildingId} />
        <Button type="submit" variant="secondary" size="sm" disabled={pending}>
          {COMMITTEE_ENGAGEMENT_UI_COPY.captureAction}
        </Button>
      </form>
    </section>
  );
}
