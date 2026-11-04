"use client";

import { useRef, useState, type ChangeEvent } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/Button/Button";
import {
  saveDebtCaseIntakeDraftAction,
  submitDebtCaseIntakeAction,
  type IntakeActionState,
} from "@/modules/debt-cases/actions/portal-debt-case-intake.actions";
import { DebtCaseDebtType } from "@/modules/debt-cases/domain/debt-case-debt-type";
import { DebtCaseIdentityDocumentType } from "@/modules/debt-cases/domain/debt-case-identity-document";
import { DebtCaseOccupancyType } from "@/modules/debt-cases/domain/debt-case-occupancy-type";
import { LegalDebtorDesignation } from "@/modules/debt-cases/domain/debt-case-parties";
import type { WarningLetterPlatformFeePaymentPreference } from "@/modules/debt-cases/domain/warning-letter-platform-fee-payment-preference";
import { WARNING_LETTER_PLATFORM_FEE_AMOUNT_MINOR } from "@/modules/debt-cases/domain/warning-letter-platform-fee.constants";
import {
  formatWarningLetterPlatformFeeAmountHe,
  PLATFORM_FEE_PREFERENCE_OPTIONS,
  formatPlatformFeePaymentPreferenceHe,
  WARNING_LETTER_PLATFORM_FEE_ONLINE_UNAVAILABLE_HE,
} from "@/modules/debt-cases/presentation/warning-letter-platform-fee.he";
import type { DebtCaseFormDefaults } from "@/modules/debt-cases/presentation/debt-case-form.defaults";
import {
  buildIntakeSavePayload,
  buildIntakeSubmitPayload,
  caseDraftJsonToFormDefaults,
  emptyIntakeBuildingFormState,
  INTAKE_WIZARD_STEPS,
  intakeBuildingFromSnapshot,
  nextIntakeWizardStep,
  prevIntakeWizardStep,
  type IntakeWizardStepId,
} from "@/modules/debt-cases/presentation/debt-case-intake-form.state";
import { DebtCaseDocumentsSection } from "@/modules/debt-cases/ui/DebtCaseDocumentsSection";
import type { DocumentStorageUiState } from "@/modules/document-assets/presentation/document-asset-view.types";
import { UserRole } from "@/modules/users/domain/user-role";
import fieldStyles from "@/modules/debt-cases/ui/DebtCases.module.scss";
import wizardStyles from "@/modules/debt-cases/ui/DebtCaseIntakeWizard.module.scss";

type BuildingOption = { buildingId: string; displayName: string; city: string };

type Props = {
  role: UserRole;
  repAssignedBuildingId: string | null;
  accessibleBuildings: BuildingOption[];
  intakeDraftId?: string;
  initialRevision?: number;
  initialBuildingMode?: "new" | "existing";
  initialExistingBuildingId?: string | null;
  initialBuilding?: {
    displayName: string;
    city: string;
    street: string;
    houseNumber: string;
    postalCode: string;
  };
  initialCaseDraft?: Record<string, unknown>;
  initialPlatformFeePreference?: WarningLetterPlatformFeePaymentPreference | null;
  storageState: DocumentStorageUiState;
};

const initialState: IntakeActionState = { ok: false };

function debtTypeLabel(debtType: DebtCaseDebtType): string {
  if (debtType === DebtCaseDebtType.SPECIAL_ASSESSMENT) {
    return "חיוב מיוחד";
  }
  return "דמי ועד שוטפים";
}

function occupancyLabel(value: DebtCaseOccupancyType): string {
  return value === DebtCaseOccupancyType.TENANT ? "שוכר" : "בעלות";
}

function legalDebtorLabel(value: LegalDebtorDesignation): string {
  return value === LegalDebtorDesignation.TENANT ? "השוכר" : "בעלי הדירה";
}

export function DebtCaseIntakeClientForm({
  role,
  repAssignedBuildingId,
  accessibleBuildings,
  intakeDraftId: initialIntakeDraftId,
  initialRevision = 0,
  initialBuildingMode = "new",
  initialExistingBuildingId,
  initialBuilding,
  initialCaseDraft = {},
  initialPlatformFeePreference = null,
  storageState,
}: Props) {
  const router = useRouter();
  const [step, setStep] = useState<IntakeWizardStepId>(0);
  const [intakeDraftId, setIntakeDraftId] = useState(initialIntakeDraftId ?? "");
  const [revision, setRevision] = useState(initialRevision);
  const [feedback, setFeedback] = useState<IntakeActionState | null>(null);
  const [pending, setPending] = useState(false);

  const lockedBuilding = Boolean(repAssignedBuildingId);
  const [buildingMode, setBuildingMode] = useState<"new" | "existing">(
    lockedBuilding ? "existing" : initialBuildingMode,
  );
  const [existingBuildingId, setExistingBuildingId] = useState(
    repAssignedBuildingId ?? initialExistingBuildingId ?? accessibleBuildings[0]?.buildingId ?? "",
  );
  const [buildingFields, setBuildingFields] = useState(() =>
    intakeBuildingFromSnapshot(initialBuilding ?? emptyIntakeBuildingFormState()),
  );
  const [caseForm, setCaseForm] = useState<DebtCaseFormDefaults>(() =>
    caseDraftJsonToFormDefaults(initialCaseDraft),
  );
  const [occupancyType, setOccupancyType] = useState(caseForm.occupancyType);
  const [debtType, setDebtType] = useState(caseForm.debtType);
  const [platformFeePreference, setPlatformFeePreference] =
    useState<WarningLetterPlatformFeePaymentPreference | null>(initialPlatformFeePreference);
  const [paymentStepError, setPaymentStepError] = useState<string | null>(null);
  const parkedTenantRef = useRef<Pick<
    DebtCaseFormDefaults,
    | "tenantFullName"
    | "tenantMobile"
    | "tenantIdentityType"
    | "tenantIdentityNumber"
    | "tenantEmail"
  > | null>(null);

  const showTenant = occupancyType === DebtCaseOccupancyType.TENANT;
  const showSpecial = debtType === DebtCaseDebtType.SPECIAL_ASSESSMENT;
  const assignedBuilding = accessibleBuildings.find((b) => b.buildingId === repAssignedBuildingId);

  const patchCase =
    <K extends keyof DebtCaseFormDefaults>(key: K) =>
    (event: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
      setCaseForm((prev) => ({ ...prev, [key]: event.target.value as DebtCaseFormDefaults[K] }));
    };

  const patchBuilding =
    <K extends keyof typeof buildingFields>(key: K) =>
    (event: ChangeEvent<HTMLInputElement>) => {
      setBuildingFields((prev) => ({ ...prev, [key]: event.target.value }));
    };

  function payloadBase() {
    return {
      intakeDraftId: intakeDraftId || undefined,
      expectedRevision: revision,
      lockedBuilding,
      buildingMode,
      existingBuildingId,
      buildingFields,
      caseForm: { ...caseForm, occupancyType, debtType },
      platformFeePreference,
    };
  }

  async function runSave() {
    setPending(true);
    setFeedback(null);
    const formData = new FormData();
    formData.set("payload", JSON.stringify(buildIntakeSavePayload(payloadBase())));
    const result = await saveDebtCaseIntakeDraftAction(initialState, formData);
    setPending(false);
    setFeedback(result);
    if (result.ok && result.intakeDraftId) {
      setIntakeDraftId(result.intakeDraftId);
      if (result.revision != null) {
        setRevision(result.revision);
      }
      if (!initialIntakeDraftId && result.intakeDraftId) {
        router.replace(`/app/debt-cases/intake/${result.intakeDraftId}`);
      }
    }
    return result;
  }

  async function runSubmit() {
    if (!platformFeePreference) {
      setPaymentStepError("יש לבחור אופן תשלום עבור מכתב ההתראה.");
      setStep(4);
      return;
    }
    setPaymentStepError(null);
    let draftId = intakeDraftId;
    let rev = revision;
    if (!draftId) {
      const saveResult = await runSave();
      if (!saveResult.ok || !saveResult.intakeDraftId) {
        return;
      }
      draftId = saveResult.intakeDraftId;
      rev = saveResult.revision ?? rev;
    }
    setPending(true);
    setFeedback(null);
    const formData = new FormData();
    formData.set(
      "payload",
      JSON.stringify(
        buildIntakeSubmitPayload({
          ...payloadBase(),
          expectedRevision: rev,
          intakeDraftId: draftId,
          submitIdempotencyKey:
            typeof crypto !== "undefined" && crypto.randomUUID
              ? crypto.randomUUID()
              : `submit-${Date.now()}`,
        }),
      ),
    );
    const result = await submitDebtCaseIntakeAction(initialState, formData);
    setPending(false);
    setFeedback(result);
    if (result.ok && result.intakeDraftId) {
      setIntakeDraftId(result.intakeDraftId);
      if (result.revision != null) {
        setRevision(result.revision);
      }
    }
    if (result.ok && result.pendingBuildingReview) {
      router.push("/app");
    }
  }

  function renderBuildingStep() {
    return (
      <div className={wizardStyles.stepPanel}>
        <h2 className={wizardStyles.stepHeading}>פרטי הבניין</h2>
        <p className={wizardStyles.stepLead}>
          הזינו את פרטי הבניין או בחרו בניין קיים. ניתן להשלים ולשמור טיוטה בכל שלב.
        </p>
        {lockedBuilding ? (
          <div className={wizardStyles.lockedBuildingCard} role="status">
            <strong>בניין משויך לחשבון</strong>
            <p>
              {assignedBuilding?.displayName ?? "הבניין המורשה שלכם"}{" "}
              {assignedBuilding?.city ? `· ${assignedBuilding.city}` : null}
            </p>
            <p>לא ניתן ליצור או להחליף בניין דרך טופס זה.</p>
          </div>
        ) : role === UserRole.MANAGEMENT_COMPANY && accessibleBuildings.length > 0 ? (
          <div className={fieldStyles.fieldRow}>
            <label className={fieldStyles.label}>
              סוג בחירה
              <select
                className={fieldStyles.select}
                value={buildingMode === "existing" ? "existing" : "new"}
                onChange={(event) =>
                  setBuildingMode(event.target.value === "existing" ? "existing" : "new")
                }
              >
                <option value="existing">בניין קיים</option>
                <option value="new">בניין חדש</option>
              </select>
            </label>
            {buildingMode === "existing" ? (
              <label className={fieldStyles.label}>
                בניין
                <select
                  className={fieldStyles.select}
                  value={existingBuildingId}
                  onChange={(event) => setExistingBuildingId(event.target.value)}
                >
                  {accessibleBuildings.map((row) => (
                    <option key={row.buildingId} value={row.buildingId}>
                      {row.displayName}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}
          </div>
        ) : null}

        {!lockedBuilding && (role !== UserRole.MANAGEMENT_COMPANY || buildingMode === "new") ? (
          <div className={fieldStyles.fieldGrid}>
            <label className={fieldStyles.label}>
              שם הבניין
              <input
                className={fieldStyles.input}
                value={buildingFields.displayName}
                onChange={patchBuilding("displayName")}
              />
            </label>
            <label className={fieldStyles.label}>
              עיר
              <input
                className={fieldStyles.input}
                value={buildingFields.city}
                onChange={patchBuilding("city")}
              />
            </label>
            <label className={fieldStyles.label}>
              רחוב
              <input
                className={fieldStyles.input}
                value={buildingFields.street}
                onChange={patchBuilding("street")}
              />
            </label>
            <label className={fieldStyles.label}>
              מספר בית
              <input
                className={fieldStyles.input}
                value={buildingFields.houseNumber}
                onChange={patchBuilding("houseNumber")}
              />
            </label>
            <label className={fieldStyles.label}>
              מיקוד (אופציונלי)
              <input
                className={fieldStyles.input}
                value={buildingFields.postalCode}
                onChange={patchBuilding("postalCode")}
              />
            </label>
          </div>
        ) : null}
      </div>
    );
  }

  function renderDebtorStep() {
    const ownerBlocks = [
      { title: "בעלים ראשון", index: 0 as const },
      { title: "בעלים שני (אופציונלי)", index: 1 as const },
    ];
    const ownerKeys = [
      {
        fullName: "owner0FullName" as const,
        mobile: "owner0Mobile" as const,
        identityType: "owner0IdentityType" as const,
        identityNumber: "owner0IdentityNumber" as const,
      },
      {
        fullName: "owner1FullName" as const,
        mobile: "owner1Mobile" as const,
        identityType: "owner1IdentityType" as const,
        identityNumber: "owner1IdentityNumber" as const,
      },
    ];

    return (
      <div className={wizardStyles.stepPanel}>
        <h2 className={wizardStyles.stepHeading}>פרטי החייב</h2>
        <p className={wizardStyles.stepLead}>פרטי הדירה, בעלים, אכלוס וכתובת למשלוח דואר.</p>

        <div className={wizardStyles.fieldGroup}>
          <label className={fieldStyles.label} htmlFor="intake-apartmentNumber">
            מספר דירה
            <input
              id="intake-apartmentNumber"
              className={fieldStyles.input}
              value={caseForm.apartmentNumber}
              onChange={patchCase("apartmentNumber")}
            />
          </label>
        </div>

        {ownerBlocks.map(({ title, index }) => {
          const keys = ownerKeys[index];
          return (
            <div key={index} className={wizardStyles.fieldGroup}>
              <h3 className={wizardStyles.fieldGroupTitle}>{title}</h3>
              <div className={fieldStyles.fieldGrid}>
                <label className={fieldStyles.label}>
                  שם מלא
                  <input
                    className={fieldStyles.input}
                    value={caseForm[keys.fullName]}
                    onChange={patchCase(keys.fullName)}
                  />
                </label>
                <label className={fieldStyles.label}>
                  נייד
                  <input
                    className={fieldStyles.input}
                    inputMode="tel"
                    value={caseForm[keys.mobile]}
                    onChange={patchCase(keys.mobile)}
                  />
                </label>
                <label className={fieldStyles.label}>
                  סוג מסמך זיהוי
                  <select
                    className={fieldStyles.select}
                    value={caseForm[keys.identityType]}
                    onChange={patchCase(keys.identityType)}
                  >
                    <option value="">—</option>
                    <option value={DebtCaseIdentityDocumentType.ISRAELI_ID}>ת.ז.</option>
                    <option value={DebtCaseIdentityDocumentType.COMPANY_HP}>ח.פ.</option>
                  </select>
                </label>
                <label className={fieldStyles.label}>
                  מספר זיהוי
                  <input
                    className={fieldStyles.input}
                    value={caseForm[keys.identityNumber]}
                    onChange={patchCase(keys.identityNumber)}
                  />
                </label>
              </div>
            </div>
          );
        })}

        <div className={fieldStyles.fieldGrid}>
          <label className={fieldStyles.label} htmlFor="occupancyType">
            מצב אכלוס
            <select
              id="occupancyType"
              className={fieldStyles.select}
              value={occupancyType}
              onChange={(event) => {
                const next = event.target.value as DebtCaseOccupancyType;
                setOccupancyType(next);
                if (next === DebtCaseOccupancyType.OWNER) {
                  setCaseForm((prev) => {
                    parkedTenantRef.current = {
                      tenantFullName: prev.tenantFullName,
                      tenantMobile: prev.tenantMobile,
                      tenantIdentityType: prev.tenantIdentityType,
                      tenantIdentityNumber: prev.tenantIdentityNumber,
                      tenantEmail: prev.tenantEmail,
                    };
                    return {
                      ...prev,
                      occupancyType: next,
                      tenantFullName: "",
                      tenantMobile: "",
                      tenantIdentityType: "",
                      tenantIdentityNumber: "",
                      tenantEmail: "",
                    };
                  });
                  return;
                }
                setCaseForm((prev) => {
                  const parked = parkedTenantRef.current;
                  if (!parked) {
                    return { ...prev, occupancyType: next };
                  }
                  parkedTenantRef.current = null;
                  return { ...prev, occupancyType: next, ...parked };
                });
              }}
            >
              <option value={DebtCaseOccupancyType.OWNER}>בעלות</option>
              <option value={DebtCaseOccupancyType.TENANT}>שוכר</option>
            </select>
          </label>
          <label className={fieldStyles.label} htmlFor="legalDebtorDesignation">
            חייב משפטי
            <select
              id="legalDebtorDesignation"
              className={fieldStyles.select}
              value={caseForm.legalDebtorDesignation}
              onChange={patchCase("legalDebtorDesignation")}
            >
              <option value={LegalDebtorDesignation.PROPERTY_OWNERS}>בעלי הדירה</option>
              <option value={LegalDebtorDesignation.TENANT}>השוכר</option>
            </select>
          </label>
        </div>

        {showTenant ? (
          <div className={wizardStyles.fieldGroup}>
            <h3 className={wizardStyles.fieldGroupTitle}>פרטי שוכר</h3>
            <div className={fieldStyles.fieldGrid}>
              <label className={fieldStyles.label}>
                שם שוכר
                <input
                  className={fieldStyles.input}
                  value={caseForm.tenantFullName}
                  onChange={patchCase("tenantFullName")}
                />
              </label>
              <label className={fieldStyles.label}>
                נייד שוכר
                <input
                  className={fieldStyles.input}
                  value={caseForm.tenantMobile}
                  onChange={patchCase("tenantMobile")}
                />
              </label>
              <label className={fieldStyles.label}>
                סוג מסמך זיהוי
                <select
                  className={fieldStyles.select}
                  value={caseForm.tenantIdentityType}
                  onChange={patchCase("tenantIdentityType")}
                >
                  <option value="">—</option>
                  <option value={DebtCaseIdentityDocumentType.ISRAELI_ID}>ת.ז.</option>
                  <option value={DebtCaseIdentityDocumentType.COMPANY_HP}>ח.פ.</option>
                </select>
              </label>
              <label className={fieldStyles.label}>
                מספר זיהוי
                <input
                  className={fieldStyles.input}
                  value={caseForm.tenantIdentityNumber}
                  onChange={patchCase("tenantIdentityNumber")}
                />
              </label>
            </div>
          </div>
        ) : null}

        <label className={fieldStyles.label} htmlFor="postalAddress">
          כתובת למכתבים (אם שונה)
          <input
            id="postalAddress"
            className={fieldStyles.input}
            value={caseForm.postalAddress}
            onChange={patchCase("postalAddress")}
          />
        </label>
      </div>
    );
  }

  function renderDebtStep() {
    return (
      <div className={wizardStyles.stepPanel}>
        <h2 className={wizardStyles.stepHeading}>פרטי החוב</h2>
        <p className={wizardStyles.stepLead}>
          סוג החוב, סכום ותקופות — בהתאם לכללי המערכת. הסכום מוזן בשקלים חדשים.
        </p>
        <div className={fieldStyles.fieldGrid}>
          <label className={fieldStyles.label} htmlFor="debtType">
            סוג חוב
            <select
              id="debtType"
              className={fieldStyles.select}
              value={debtType}
              onChange={(event) => {
                const next = event.target.value as DebtCaseDebtType;
                setDebtType(next);
                setCaseForm((prev) => ({ ...prev, debtType: next }));
              }}
            >
              <option value={DebtCaseDebtType.REGULAR_VAAD}>דמי ועד שוטפים</option>
              <option value={DebtCaseDebtType.SPECIAL_ASSESSMENT}>חיוב מיוחד</option>
            </select>
          </label>
          <label className={fieldStyles.label} htmlFor="principalAmountNis">
            סכום כולל (₪)
            <input
              id="principalAmountNis"
              className={fieldStyles.input}
              inputMode="decimal"
              value={caseForm.principalAmountNis}
              onChange={patchCase("principalAmountNis")}
            />
          </label>
          <label className={fieldStyles.label} htmlFor="periodStartMonth">
            תחילת תקופה (YYYY-MM)
            <input
              id="periodStartMonth"
              className={fieldStyles.input}
              placeholder="2024-01"
              value={caseForm.periodStartMonth}
              onChange={patchCase("periodStartMonth")}
            />
          </label>
          <label className={fieldStyles.label} htmlFor="periodEndMonth">
            סיום תקופה (YYYY-MM)
            <input
              id="periodEndMonth"
              className={fieldStyles.input}
              placeholder="2024-06"
              value={caseForm.periodEndMonth}
              onChange={patchCase("periodEndMonth")}
            />
          </label>
        </div>
        {showSpecial ? (
          <label className={fieldStyles.label} htmlFor="specialAssessmentDescription">
            תיאור חיוב מיוחד
            <textarea
              id="specialAssessmentDescription"
              className={fieldStyles.textarea}
              value={caseForm.specialAssessmentDescription}
              onChange={patchCase("specialAssessmentDescription")}
            />
          </label>
        ) : null}
      </div>
    );
  }

  function renderPaymentStep() {
    return (
      <div className={wizardStyles.stepPanel}>
        <h2 className={wizardStyles.stepHeading}>אופן תשלום</h2>
        <p className={wizardStyles.stepLead}>
          עלות מכתב התראה:{" "}
          <strong>{formatWarningLetterPlatformFeeAmountHe(WARNING_LETTER_PLATFORM_FEE_AMOUNT_MINOR)}</strong>
        </p>
        <p className={wizardStyles.stepLead} role="note">
          {WARNING_LETTER_PLATFORM_FEE_ONLINE_UNAVAILABLE_HE}
        </p>
        <fieldset className={wizardStyles.paymentFieldset}>
          <legend className={wizardStyles.paymentLegend}>בחרו אופן תשלום</legend>
          {PLATFORM_FEE_PREFERENCE_OPTIONS.map((option) => {
            const selected = platformFeePreference === option.value;
            return (
              <label
                key={option.value}
                className={
                  selected ? wizardStyles.paymentOptionSelected : wizardStyles.paymentOption
                }
              >
                <input
                  type="radio"
                  name="platformFeePreference"
                  value={option.value}
                  checked={selected}
                  onChange={() => {
                    setPlatformFeePreference(option.value);
                    setPaymentStepError(null);
                  }}
                  className={wizardStyles.paymentRadio}
                />
                <span className={wizardStyles.paymentOptionTitle}>{option.label}</span>
                <span className={wizardStyles.paymentOptionDescription}>{option.description}</span>
              </label>
            );
          })}
        </fieldset>
        {paymentStepError ? (
          <p className={wizardStyles.feedbackError} role="alert">
            {paymentStepError}
          </p>
        ) : null}
      </div>
    );
  }

  function renderDocumentsStep() {
    return (
      <div className={wizardStyles.stepPanel}>
        <h2 className={wizardStyles.stepHeading}>מסמכים מצורפים</h2>
        <p className={wizardStyles.stepLead}>
          ניתן לצרף מסמכים תומכים לפני שליחה. שמרו טיוטה כדי לקבל מזהה טיוטה להעלאה (כשאחסון מוגדר).
        </p>
        {intakeDraftId ? (
          <DebtCaseDocumentsSection variant="portal" documents={[]} storageState={storageState} embedded />
        ) : (
          <p className={fieldStyles.sectionHint} role="note">
            לחצו «שמירת טיוטה» כדי ליצור טיוטה ולצרף מסמכים.
          </p>
        )}
      </div>
    );
  }

  function buildingReviewLines(): string[] {
    if (lockedBuilding || buildingMode === "existing") {
      const row = accessibleBuildings.find((b) => b.buildingId === existingBuildingId);
      return [row?.displayName ?? "בניין קיים", row?.city ?? ""].filter(Boolean);
    }
    return [
      buildingFields.displayName || "—",
      [buildingFields.street, buildingFields.houseNumber].filter(Boolean).join(" ") || "—",
      buildingFields.city || "—",
      buildingFields.postalCode ? `מיקוד ${buildingFields.postalCode}` : "",
    ].filter((line) => line && line !== "—");
  }

  function renderReviewStep() {
    return (
      <div className={wizardStyles.stepPanel}>
        <h2 className={wizardStyles.stepHeading}>בדיקה ושליחה</h2>
        <p className={wizardStyles.stepLead}>
          וודאו שהפרטים נכונים. השליחה לעורך הדין מתבצעת רק בלחיצה על «שליחה לבדיקת עורך דין».
        </p>

        <div className={wizardStyles.reviewBlock}>
          <div className={wizardStyles.reviewBlockHeader}>
            <h3 className={wizardStyles.reviewBlockTitle}>בניין</h3>
            <button type="button" className={wizardStyles.editStepLink} onClick={() => setStep(0)}>
              עריכה
            </button>
          </div>
          <ul className={wizardStyles.reviewList}>
            {buildingReviewLines().map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </div>

        <div className={wizardStyles.reviewBlock}>
          <div className={wizardStyles.reviewBlockHeader}>
            <h3 className={wizardStyles.reviewBlockTitle}>חייב</h3>
            <button type="button" className={wizardStyles.editStepLink} onClick={() => setStep(1)}>
              עריכה
            </button>
          </div>
          <ul className={wizardStyles.reviewList}>
            <li>
              <span className={wizardStyles.reviewRow}>
                <span className={wizardStyles.reviewLabel}>דירה</span>
                <span className={wizardStyles.reviewValue}>{caseForm.apartmentNumber || "—"}</span>
              </span>
            </li>
            <li>
              <span className={wizardStyles.reviewRow}>
                <span className={wizardStyles.reviewLabel}>בעלים</span>
                <span className={wizardStyles.reviewValue}>{caseForm.owner0FullName || "—"}</span>
              </span>
            </li>
            <li>
              <span className={wizardStyles.reviewRow}>
                <span className={wizardStyles.reviewLabel}>אכלוס</span>
                <span className={wizardStyles.reviewValue}>{occupancyLabel(occupancyType)}</span>
              </span>
            </li>
            <li>
              <span className={wizardStyles.reviewRow}>
                <span className={wizardStyles.reviewLabel}>חייב משפטי</span>
                <span className={wizardStyles.reviewValue}>
                  {legalDebtorLabel(caseForm.legalDebtorDesignation)}
                </span>
              </span>
            </li>
          </ul>
        </div>

        <div className={wizardStyles.reviewBlock}>
          <div className={wizardStyles.reviewBlockHeader}>
            <h3 className={wizardStyles.reviewBlockTitle}>חוב</h3>
            <button type="button" className={wizardStyles.editStepLink} onClick={() => setStep(2)}>
              עריכה
            </button>
          </div>
          <ul className={wizardStyles.reviewList}>
            <li>{debtTypeLabel(debtType)}</li>
            <li>{caseForm.principalAmountNis ? `₪${caseForm.principalAmountNis}` : "—"}</li>
            <li>
              {caseForm.periodStartMonth && caseForm.periodEndMonth
                ? `${caseForm.periodStartMonth} – ${caseForm.periodEndMonth}`
                : "—"}
            </li>
          </ul>
        </div>

        <div className={wizardStyles.reviewBlock}>
          <div className={wizardStyles.reviewBlockHeader}>
            <h3 className={wizardStyles.reviewBlockTitle}>תשלום</h3>
            <button type="button" className={wizardStyles.editStepLink} onClick={() => setStep(4)}>
              עריכה
            </button>
          </div>
          <ul className={wizardStyles.reviewList}>
            <li>{formatWarningLetterPlatformFeeAmountHe(WARNING_LETTER_PLATFORM_FEE_AMOUNT_MINOR)}</li>
            <li>
              {platformFeePreference
                ? formatPlatformFeePaymentPreferenceHe(platformFeePreference)
                : "— לא נבחר —"}
            </li>
          </ul>
        </div>

        <div className={wizardStyles.reviewBlock}>
          <div className={wizardStyles.reviewBlockHeader}>
            <h3 className={wizardStyles.reviewBlockTitle}>מסמכים</h3>
            <button type="button" className={wizardStyles.editStepLink} onClick={() => setStep(3)}>
              עריכה
            </button>
          </div>
          <p className={fieldStyles.sectionHint}>מסמכים מצורפים יוצגו לאחר הגדרת אחסון והעלאה.</p>
        </div>
      </div>
    );
  }

  function renderStepContent() {
    switch (step) {
      case 0:
        return renderBuildingStep();
      case 1:
        return renderDebtorStep();
      case 2:
        return renderDebtStep();
      case 3:
        return renderDocumentsStep();
      case 4:
        return renderPaymentStep();
      case 5:
        return renderReviewStep();
      default:
        return null;
    }
  }

  return (
    <div className={wizardStyles.shell}>
      <div className={wizardStyles.card}>
        <ol className={wizardStyles.stepNav} aria-label="שלבי הטופס">
          {INTAKE_WIZARD_STEPS.map((item) => (
            <li key={item.id} className={wizardStyles.stepNavItem}>
              <div
                className={wizardStyles.stepNavButton}
                data-active={step === item.id}
                data-complete={step > item.id}
                aria-current={step === item.id ? "step" : undefined}
              >
                <span className={wizardStyles.stepNavIndex}>שלב {item.id + 1}</span>
                <span>{item.label}</span>
              </div>
            </li>
          ))}
        </ol>

        {feedback?.message ? (
          <p
            className={feedback.ok ? wizardStyles.feedbackSuccess : wizardStyles.feedbackError}
            role="status"
          >
            {feedback.message}
          </p>
        ) : null}

        {renderStepContent()}

        <div className={wizardStyles.footer}>
          <div className={wizardStyles.footerPrimary}>
            {step > 0 ? (
              <Button
                type="button"
                variant="secondary"
                disabled={pending}
                onClick={() => setStep(prevIntakeWizardStep(step))}
              >
                חזרה
              </Button>
            ) : null}
            {step < 5 ? (
              <Button
                type="button"
                disabled={pending}
                onClick={() => setStep(nextIntakeWizardStep(step))}
              >
                המשך
              </Button>
            ) : (
              <Button type="button" disabled={pending} onClick={() => runSubmit()}>
                {pending ? "שולח…" : "שליחה לבדיקת עורך דין"}
              </Button>
            )}
          </div>
          <Button type="button" variant="ghost" disabled={pending} onClick={() => runSave()}>
            {pending ? "שומר…" : "שמירת טיוטה"}
          </Button>
        </div>
      </div>
    </div>
  );
}
