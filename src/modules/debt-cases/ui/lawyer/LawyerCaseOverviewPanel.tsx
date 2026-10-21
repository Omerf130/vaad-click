"use client";

import { DebtCaseOccupancyType } from "@/modules/debt-cases/domain/debt-case-occupancy-type";
import type { LawyerDebtCaseDetailBundle } from "@/modules/debt-cases/services/lawyer-debt-case-query.service";
import {
  formatDebtPeriodDisplayHe,
  formatDebtTypeHe,
  formatIdentityDocumentTypeHe,
  formatLegalDebtorHe,
  formatLegalHoldReasonHe,
  formatMinorUnitsToNisDisplay,
  formatMobileE164ForDisplayHe,
  formatOccupancyTypeHe,
  formatValidationSeverityHe,
} from "@/modules/debt-cases/presentation/debt-case-labels.he";
import {
  LAWYER_CASE_SECTION_DEBT,
  LAWYER_CASE_SECTION_LEGAL_READINESS,
  LAWYER_CASE_SECTION_PARTIES,
} from "@/modules/debt-cases/presentation/lawyer-case-section-navigation";
import { StatusBadge } from "@/components/ui/StatusBadge/StatusBadge";
import {
  DebtCaseLawyerReviewStatusBadge,
  DebtCaseWorkflowStatusBadge,
} from "@/modules/debt-cases/ui/DebtCaseStatusBadges";
import styles from "@/modules/debt-cases/ui/lawyer/LawyerDebtCasesAdmin.module.scss";

type Props = {
  bundle: LawyerDebtCaseDetailBundle;
  onJumpToSection: (sectionId: string) => void;
};

export function LawyerCaseOverviewPanel({ bundle, onJumpToSection }: Props) {
  const { record, legalReadiness } = bundle;
  const owners = record.parties.propertyOwners;
  const tenant = record.parties.tenant;
  const primaryOwnerName = owners[0]?.fullName?.trim();

  return (
    <div className={styles.overviewStack}>
      <section className={styles.caseSummaryCard} aria-labelledby="case-summary-title">
        <h2 id="case-summary-title" className={styles.caseSummaryTitle}>
          סיכום תיק
        </h2>
        <dl className={styles.summaryGrid}>
          <div>
            <dt>חייב משפטי</dt>
            <dd>{formatLegalDebtorHe(record.parties.legalDebtorDesignation)}</dd>
          </div>
          <div>
            <dt>שם לתצוגה</dt>
            <dd>{primaryOwnerName || "—"}</dd>
          </div>
          <div>
            <dt>סכום רשום</dt>
            <dd>{formatMinorUnitsToNisDisplay(record.principalAmountMinor)} ₪</dd>
          </div>
          <div>
            <dt>תקופת חוב</dt>
            <dd>{formatDebtPeriodDisplayHe(record.periodStartMonth, record.periodEndMonth)}</dd>
          </div>
          <div>
            <dt>סוג חוב</dt>
            <dd>{formatDebtTypeHe(record.debtType)}</dd>
          </div>
        </dl>
        <div className={styles.summaryStatusRow}>
          <span className={styles.summaryStatusLabel}>מחזור תיק</span>
          <DebtCaseWorkflowStatusBadge status={record.workflowStatus} />
          <span className={styles.summaryStatusLabel}>החלטת בדיקה</span>
          <DebtCaseLawyerReviewStatusBadge status={record.lawyerReviewStatus} />
        </div>
        <nav className={styles.sectionJumpNav} aria-label="קפיצה לפרקים בסקירה">
          <button type="button" className={styles.sectionJumpButton} onClick={() => onJumpToSection(LAWYER_CASE_SECTION_LEGAL_READINESS)}>
            מוכנות משפטית
          </button>
          <button type="button" className={styles.sectionJumpButton} onClick={() => onJumpToSection(LAWYER_CASE_SECTION_PARTIES)}>
            צדדים
          </button>
          <button type="button" className={styles.sectionJumpButton} onClick={() => onJumpToSection(LAWYER_CASE_SECTION_DEBT)}>
            פרטי חוב
          </button>
        </nav>
      </section>

      <p className={styles.bannerInfoCompact} role="note">
        הגשה לבדיקה ואישור להכנת מכתב אינם שולחים מכתב. אישור להכנת מכתב הוא החלטת ביקורת פנימית בלבד — לא
        אישור משפטי לשליחה או גבייה.
      </p>

      <section
        id={LAWYER_CASE_SECTION_LEGAL_READINESS}
        className={styles.sectionLegalReadiness}
        aria-labelledby="readiness-title"
        tabIndex={-1}
      >
        <h2 id="readiness-title" className={styles.sectionTitle}>
          מוכנות משפטית
        </h2>
        <p
          className={
            legalReadiness.legalTreatmentAllowed ? styles.bannerSuccess : styles.bannerWarning
          }
          role="status"
        >
          {legalReadiness.legalTreatmentAllowed
            ? "הבניין מוכן לטיפול משפטי (שליחת מכתב) — בכפוף לפעולה מפורשת נפרדת."
            : "טיפול משפטי (שליחת מכתב) חסום עד השלמת תנאי המוכנות."}
        </p>
        <dl className={styles.definitionListCompact}>
          <div>
            <dt>טיפול משפטי / מכתב</dt>
            <dd>
              <StatusBadge
                variant={legalReadiness.legalTreatmentAllowed ? "success" : "warning"}
                label={legalReadiness.legalTreatmentAllowed ? "מותר" : "חסום"}
              />
            </dd>
          </div>
        </dl>
        {legalReadiness.holdReasons.length > 0 ? (
          <ul className={styles.blockerList}>
            {legalReadiness.holdReasons.map((reason) => (
              <li key={reason}>{formatLegalHoldReasonHe(reason)}</li>
            ))}
          </ul>
        ) : (
          <p className={styles.metaLine}>אין חסימות מוכנות משפטית פעילות על הבניין.</p>
        )}
        {record.legalHoldReasons.length > 0 ? (
          <>
            <p className={styles.metaLineStrong}>חסימות רשומות על התיק</p>
            <ul className={styles.blockerList}>
              {record.legalHoldReasons.map((reason) => (
                <li key={reason}>{formatLegalHoldReasonHe(reason)}</li>
              ))}
            </ul>
          </>
        ) : null}
      </section>

      <details className={styles.overviewDisclosure} open>
        <summary className={styles.overviewDisclosureSummary}>פרטי צדדים וזיהוי</summary>
        <div id={LAWYER_CASE_SECTION_PARTIES} className={styles.overviewDisclosureBody}>
          <dl className={styles.definitionList}>
            <div>
              <dt>מצב אכלוס</dt>
              <dd>{formatOccupancyTypeHe(record.parties.occupancyType)}</dd>
            </div>
            <div>
              <dt>חייב משפטי</dt>
              <dd>{formatLegalDebtorHe(record.parties.legalDebtorDesignation)}</dd>
            </div>
            {record.parties.postalAddress ? (
              <div>
                <dt>כתובת למכתבים</dt>
                <dd>{record.parties.postalAddress}</dd>
              </div>
            ) : null}
          </dl>
          {owners.map((owner, index) => (
            <div key={index} className={styles.partyCard}>
              <strong>{index === 0 ? "בעלים ראשון" : "בעלים שני"}</strong>
              <dl className={styles.definitionList}>
                <div>
                  <dt>שם</dt>
                  <dd>{owner.fullName}</dd>
                </div>
                <div>
                  <dt>נייד</dt>
                  <dd>{formatMobileE164ForDisplayHe(owner.mobileE164)}</dd>
                </div>
                <div>
                  <dt>זיהוי</dt>
                  <dd>
                    {formatIdentityDocumentTypeHe(owner.identityDocumentType)}
                    {owner.identityNumber ? ` · ${owner.identityNumber}` : ""}
                  </dd>
                </div>
                {owner.email ? (
                  <div>
                    <dt>דוא&quot;ל</dt>
                    <dd>{owner.email}</dd>
                  </div>
                ) : null}
              </dl>
            </div>
          ))}
          {record.parties.occupancyType === DebtCaseOccupancyType.TENANT && tenant ? (
            <div className={styles.partyCard}>
              <strong>שוכר</strong>
              <dl className={styles.definitionList}>
                <div>
                  <dt>שם</dt>
                  <dd>{tenant.fullName}</dd>
                </div>
                <div>
                  <dt>נייד</dt>
                  <dd>{formatMobileE164ForDisplayHe(tenant.mobileE164)}</dd>
                </div>
                <div>
                  <dt>זיהוי</dt>
                  <dd>
                    {formatIdentityDocumentTypeHe(tenant.identityDocumentType)}
                    {tenant.identityNumber ? ` · ${tenant.identityNumber}` : ""}
                  </dd>
                </div>
                {tenant.email ? (
                  <div>
                    <dt>דוא&quot;ל</dt>
                    <dd>{tenant.email}</dd>
                  </div>
                ) : null}
              </dl>
            </div>
          ) : null}
        </div>
      </details>

      <details className={styles.overviewDisclosure} open>
        <summary className={styles.overviewDisclosureSummary}>פרטי חוב והגשה</summary>
        <div id={LAWYER_CASE_SECTION_DEBT} className={styles.overviewDisclosureBody}>
          <dl className={styles.definitionList}>
            <div>
              <dt>סוג חוב</dt>
              <dd>{formatDebtTypeHe(record.debtType)}</dd>
            </div>
            {record.specialAssessmentDescription ? (
              <div>
                <dt>תיאור</dt>
                <dd>{record.specialAssessmentDescription}</dd>
              </div>
            ) : null}
          </dl>
          {record.validationFlags.length > 0 ? (
            <div>
              <p className={styles.metaLineStrong}>דגלי בדיקה מההגשה</p>
              <ul className={styles.flagList}>
                {record.validationFlags.map((flag, index) => (
                  <li key={`${flag.code}-${index}`}>
                    [{formatValidationSeverityHe(flag.severity)}] {flag.messageHe}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      </details>
    </div>
  );
}
