import type { DebtCaseRecord } from "@/modules/debt-cases/domain/debt-case-record.types";
import {
  formatDebtCaseInstantHe,
  formatDebtPeriodDisplayHe,
  formatDebtTypeHe,
  formatLegalDebtorHe,
  formatMinorUnitsToNisDisplay,
  formatOccupancyTypeHe,
} from "@/modules/debt-cases/presentation/debt-case-labels.he";
import styles from "@/modules/debt-cases/ui/DebtCaseWorkspace.module.scss";

type Props = {
  record: DebtCaseRecord;
  buildingDisplayName: string;
  compact?: boolean;
};

export function OperatorDebtCaseOverviewPanel({
  record,
  buildingDisplayName,
  compact = false,
}: Props) {
  const primaryOwner = record.parties.propertyOwners[0];
  const debtorLabel = primaryOwner?.fullName?.trim() || "—";

  const Wrapper = compact ? "div" : "section";
  const wrapperProps = compact
    ? { className: styles.tabPanelSection }
    : {
        className: styles.section,
        id: "case-overview" as const,
        "aria-labelledby": "case-overview-title" as const,
      };

  return (
    <Wrapper {...wrapperProps}>
      {!compact ? (
        <h2 id="case-overview-title" className={styles.sectionTitle}>
          סקירת תיק
        </h2>
      ) : (
        <h3 className={styles.subsectionTitle}>פרטי תיק</h3>
      )}
      <dl className={styles.overviewGrid}>
        {!compact ? (
          <>
            <div>
              <dt>בניין</dt>
              <dd>{buildingDisplayName}</dd>
            </div>
            <div>
              <dt>דירה</dt>
              <dd>{record.apartmentNumberDisplay || "—"}</dd>
            </div>
          </>
        ) : null}
        <div>
          <dt>חייב (רשום)</dt>
          <dd>{debtorLabel}</dd>
        </div>
        <div>
          <dt>חייב משפטי</dt>
          <dd>{formatLegalDebtorHe(record.parties.legalDebtorDesignation)}</dd>
        </div>
        <div>
          <dt>מצב אכלוס</dt>
          <dd>{formatOccupancyTypeHe(record.parties.occupancyType)}</dd>
        </div>
        <div>
          <dt>סוג חוב</dt>
          <dd>{formatDebtTypeHe(record.debtType)}</dd>
        </div>
        <div>
          <dt>סכום החוב</dt>
          <dd>{formatMinorUnitsToNisDisplay(record.principalAmountMinor)} ₪</dd>
        </div>
        <div>
          <dt>תקופת חוב</dt>
          <dd>{formatDebtPeriodDisplayHe(record.periodStartMonth, record.periodEndMonth)}</dd>
        </div>
        {record.submittedAtIso ? (
          <div>
            <dt>הוגש לבדיקה</dt>
            <dd>{formatDebtCaseInstantHe(record.submittedAtIso)}</dd>
          </div>
        ) : null}
      </dl>
    </Wrapper>
  );
}
