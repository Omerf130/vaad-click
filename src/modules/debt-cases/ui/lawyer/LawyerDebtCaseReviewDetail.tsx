import Link from "next/link";

import { StatusBadge } from "@/components/ui/StatusBadge/StatusBadge";
import { DebtCaseOccupancyType } from "@/modules/debt-cases/domain/debt-case-occupancy-type";
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
  DebtCaseLawyerReviewStatusBadge,
  DebtCaseWorkflowStatusBadge,
} from "@/modules/debt-cases/ui/DebtCaseStatusBadges";
import type { LawyerDebtCaseDetailBundle } from "@/modules/debt-cases/services/lawyer-debt-case-query.service";
import { LawyerDebtCaseReviewActions } from "@/modules/debt-cases/ui/lawyer/LawyerDebtCaseReviewActions";
import styles from "@/modules/debt-cases/ui/lawyer/LawyerDebtCasesAdmin.module.scss";

type Props = {
  bundle: LawyerDebtCaseDetailBundle;
};

function formatDateTime(iso: string | null | undefined): string {
  if (!iso) {
    return "—";
  }
  return new Date(iso).toLocaleString("he-IL", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export function LawyerDebtCaseReviewDetail({ bundle }: Props) {
  const { record, buildingDisplayName, buildingCity, legalReadiness, canPerformReviewActions } =
    bundle;
  const owners = record.parties.propertyOwners;
  const tenant = record.parties.tenant;
  const caseTitle = `דירה ${record.apartmentNumberDisplay || "—"} · ${buildingDisplayName}`;

  return (
    <div className={styles.detailGrid}>
      <p className={styles.linkRow}>
        <Link href="/app/admin/debt-cases">חזרה לתור בדיקה</Link>
        {" · "}
        <Link href={`/app/admin/buildings/${record.buildingId}`}>פרטי בניין</Link>
      </p>

      <section className={styles.section} aria-labelledby="case-overview-title">
        <h2 id="case-overview-title" className={styles.sectionTitle}>
          {caseTitle}
        </h2>
        <dl className={styles.definitionList}>
          <div>
            <dt>בניין</dt>
            <dd>
              {buildingDisplayName}
              {buildingCity ? ` · ${buildingCity}` : ""}
            </dd>
          </div>
          <div>
            <dt>דירה</dt>
            <dd>{record.apartmentNumberDisplay || "—"}</dd>
          </div>
          <div>
            <dt>סטטוס תיק</dt>
            <dd>
              <DebtCaseWorkflowStatusBadge status={record.workflowStatus} />
            </dd>
          </div>
          <div>
            <dt>בדיקת עורך דין</dt>
            <dd>
              <DebtCaseLawyerReviewStatusBadge status={record.lawyerReviewStatus} />
            </dd>
          </div>
          <div>
            <dt>נוצר</dt>
            <dd>{formatDateTime(record.createdAtIso)}</dd>
          </div>
          <div>
            <dt>הוגש לבדיקה</dt>
            <dd>{formatDateTime(record.submittedAtIso)}</dd>
          </div>
          <div>
            <dt>סכום החוב</dt>
            <dd>{formatMinorUnitsToNisDisplay(record.principalAmountMinor)} ₪</dd>
          </div>
          <div>
            <dt>תקופת חוב</dt>
            <dd>
              {formatDebtPeriodDisplayHe(record.periodStartMonth, record.periodEndMonth)}
            </dd>
          </div>
        </dl>
      </section>

      <section className={styles.section} aria-labelledby="parties-title">
        <h2 id="parties-title" className={styles.sectionTitle}>
          צדדים
        </h2>
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
      </section>

      <section className={styles.section} aria-labelledby="debt-title">
        <h2 id="debt-title" className={styles.sectionTitle}>
          פרטי חוב
        </h2>
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
            <p className={styles.metaLine}>דגלי בדיקה מההגשה</p>
            <ul className={styles.flagList}>
              {record.validationFlags.map((flag, index) => (
                <li key={`${flag.code}-${index}`}>
                  [{formatValidationSeverityHe(flag.severity)}] {flag.messageHe}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </section>

      <section className={styles.section} aria-labelledby="readiness-title">
        <h2 id="readiness-title" className={styles.sectionTitle}>
          מוכנות משפטית
        </h2>
        <p
          className={
            legalReadiness.legalTreatmentAllowed ? styles.bannerSuccess : styles.bannerWarning
          }
        >
          {legalReadiness.legalTreatmentAllowed
            ? "הבניין מוכן לטיפול משפטי (שליחת מכתב) — בכפוף לפעולה מפורשת נפרדת."
            : "טיפול משפטי (שליחת מכתב) חסום עד השלמת תנאי המוכנות."}
        </p>
        <p className={styles.bannerInfo}>
          הגשה לבדיקה ואישור להכנת מכתב אינם שולחים מכתב. אישור להכנת מכתב הוא החלטת ביקורת פנימית
          בלבד.
        </p>
        <dl className={styles.definitionList}>
          <div>
            <dt>ניתן להגיש / לבדוק תיק</dt>
            <dd>כן — התיק הוגש לבדיקה</dd>
          </div>
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
          <ul className={styles.flagList}>
            {legalReadiness.holdReasons.map((reason) => (
              <li key={reason}>{formatLegalHoldReasonHe(reason)}</li>
            ))}
          </ul>
        ) : (
          <p className={styles.metaLine}>אין חסימות מוכנות משפטית פעילות.</p>
        )}
        {record.legalHoldReasons.length > 0 ? (
          <>
            <p className={styles.metaLine}>חסימות רשומות על התיק</p>
            <ul className={styles.flagList}>
              {record.legalHoldReasons.map((reason) => (
                <li key={reason}>{formatLegalHoldReasonHe(reason)}</li>
              ))}
            </ul>
          </>
        ) : null}
      </section>

      {canPerformReviewActions ? (
        <LawyerDebtCaseReviewActions debtCaseId={record.debtCaseId} revision={record.revision} />
      ) : (
        <p className={styles.bannerInfo} role="status">
          אין פעולות בדיקה זמינות במצב הנוכחי של התיק.
        </p>
      )}
    </div>
  );
}
