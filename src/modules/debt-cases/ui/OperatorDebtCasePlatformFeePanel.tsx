import type { DebtCaseRecord } from "@/modules/debt-cases/domain/debt-case-record.types";
import { WarningLetterPlatformFeePaymentPreference } from "@/modules/debt-cases/domain/warning-letter-platform-fee-payment-preference";
import {
  formatPlatformFeeCollectionStatusHe,
  formatPlatformFeePaymentPreferenceHe,
  formatWarningLetterPlatformFeeAmountHe,
  WARNING_LETTER_PLATFORM_FEE_ONLINE_UNAVAILABLE_HE,
} from "@/modules/debt-cases/presentation/warning-letter-platform-fee.he";
import styles from "@/modules/debt-cases/ui/DebtCaseWorkspace.module.scss";

type Props = { record: DebtCaseRecord };

export function OperatorDebtCasePlatformFeePanel({ record }: Props) {
  if (!record.platformFeePreference) {
    return null;
  }

  return (
    <section className={styles.tabPanelSection} aria-labelledby="operator-platform-fee-title">
      <h3 id="operator-platform-fee-title" className={styles.subsectionTitle}>
        תשלום מכתב התראה
      </h3>
      <dl className={styles.overviewGrid}>
        <div>
          <dt>עמלה</dt>
          <dd>{formatWarningLetterPlatformFeeAmountHe(record.platformFeeAmountMinor)}</dd>
        </div>
        <div>
          <dt>אופן תשלום שנבחר</dt>
          <dd>{formatPlatformFeePaymentPreferenceHe(record.platformFeePreference)}</dd>
        </div>
        <div>
          <dt>סטטוס</dt>
          <dd>{formatPlatformFeeCollectionStatusHe(record.platformFeeCollectionStatus)}</dd>
        </div>
      </dl>
      {record.platformFeePreference === WarningLetterPlatformFeePaymentPreference.IMMEDIATE_PAYMENT ? (
        <p className={styles.sectionHint} role="note">
          {WARNING_LETTER_PLATFORM_FEE_ONLINE_UNAVAILABLE_HE}
        </p>
      ) : null}
    </section>
  );
}
