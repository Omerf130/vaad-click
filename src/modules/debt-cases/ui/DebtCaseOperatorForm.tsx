"use client";

import { useActionState, useEffect, useRef, useState, type ChangeEvent } from "react";

import { Button } from "@/components/ui/Button/Button";
import {
  debtCaseOperatorFormAction,
  type PortalDebtCaseActionState,
} from "@/modules/debt-cases/actions/portal-debt-case.actions";
import { DebtCaseDebtType } from "@/modules/debt-cases/domain/debt-case-debt-type";
import { DebtCaseIdentityDocumentType } from "@/modules/debt-cases/domain/debt-case-identity-document";
import { DebtCaseOccupancyType } from "@/modules/debt-cases/domain/debt-case-occupancy-type";
import { LegalDebtorDesignation } from "@/modules/debt-cases/domain/debt-case-parties";
import type { DebtCaseRecord } from "@/modules/debt-cases/domain/debt-case-record.types";
import type { DebtCaseFormDefaults } from "@/modules/debt-cases/presentation/debt-case-form.defaults";
import {
  fieldHasError,
  firstInvalidElementId,
  formLevelFieldErrors,
} from "@/modules/debt-cases/presentation/debt-case-form-field-errors";
import {
  cloneDebtCaseFormDefaults,
  shouldHydrateFormFromServerDefaults,
} from "@/modules/debt-cases/presentation/debt-case-operator-form-state";
import { isOperatorDebtCaseEditable } from "@/modules/debt-cases/presentation/debt-case-editability";
import { formatValidationSeverityHe } from "@/modules/debt-cases/presentation/debt-case-labels.he";
import styles from "@/modules/debt-cases/ui/DebtCases.module.scss";

const initial: PortalDebtCaseActionState = { ok: false };

type Props = {
  buildingId: string;
  record: DebtCaseRecord;
  defaults: DebtCaseFormDefaults;
  compactLayout?: boolean;
};

function FieldError({ name, errors }: { name: string; errors?: Record<string, string> }) {
  const message = errors?.[name];
  if (!message) {
    return null;
  }
  return (
    <p className={styles.fieldError} id={`${name}-error`} role="alert">
      {message}
    </p>
  );
}

function controlClassName(
  name: string,
  errors: Record<string, string> | undefined,
  kind: "input" | "select" | "textarea",
): string {
  const base =
    kind === "input" ? styles.input : kind === "select" ? styles.select : styles.textarea;
  const invalid =
    kind === "input"
      ? styles.inputInvalid
      : kind === "select"
        ? styles.selectInvalid
        : styles.textareaInvalid;
  return fieldHasError(errors, name) ? `${base} ${invalid}` : base;
}

function fieldAriaProps(name: string, errors?: Record<string, string>) {
  if (!fieldHasError(errors, name)) {
    return {};
  }
  return {
    "aria-invalid": true as const,
    "aria-describedby": `${name}-error`,
  };
}

function hydrateFormFromDefaults(
  defaults: DebtCaseFormDefaults,
  setFormValues: (values: DebtCaseFormDefaults) => void,
  setOccupancyType: (value: DebtCaseOccupancyType) => void,
  setDebtType: (value: DebtCaseDebtType) => void,
) {
  setFormValues(cloneDebtCaseFormDefaults(defaults));
  setOccupancyType(defaults.occupancyType);
  setDebtType(defaults.debtType);
}

export function DebtCaseOperatorForm({
  buildingId,
  record,
  defaults,
  compactLayout = false,
}: Props) {
  const editable = isOperatorDebtCaseEditable(record);
  const [formValues, setFormValues] = useState(() => cloneDebtCaseFormDefaults(defaults));
  const [occupancyType, setOccupancyType] = useState(defaults.occupancyType);
  const [debtType, setDebtType] = useState(defaults.debtType);
  const [state, formAction, pending] = useActionState(debtCaseOperatorFormAction, initial);
  const revision = state.revision ?? record.revision;

  const prevDebtCaseIdRef = useRef(record.debtCaseId);
  const prevEditableRef = useRef(editable);
  const syncedRevisionRef = useRef(record.revision);
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
  const fieldErrors = state.fieldErrors;
  const hasFieldErrors = Boolean(fieldErrors && Object.keys(fieldErrors).length > 0);
  const formLevelErrors = fieldErrors ? formLevelFieldErrors(fieldErrors) : [];

  useEffect(() => {
    const becameReadOnly = prevEditableRef.current && !editable;
    if (
      shouldHydrateFormFromServerDefaults({
        previousDebtCaseId: prevDebtCaseIdRef.current,
        nextDebtCaseId: record.debtCaseId,
        formIsEditable: editable,
        becameReadOnly,
      })
    ) {
      hydrateFormFromDefaults(defaults, setFormValues, setOccupancyType, setDebtType);
      syncedRevisionRef.current = record.revision;
    }
    prevDebtCaseIdRef.current = record.debtCaseId;
    prevEditableRef.current = editable;
  }, [record.debtCaseId, record.revision, editable, defaults]);

  useEffect(() => {
    if (state.ok && state.lastIntent === "save" && state.revision != null) {
      syncedRevisionRef.current = state.revision;
    }
    if (state.ok && state.lastIntent === "submit" && state.revision != null) {
      syncedRevisionRef.current = state.revision;
    }
  }, [state.ok, state.lastIntent, state.revision]);

  useEffect(() => {
    if (state.ok || !fieldErrors || Object.keys(fieldErrors).length === 0) {
      return;
    }
    const elementId = firstInvalidElementId(fieldErrors);
    if (!elementId) {
      return;
    }
    const element = document.getElementById(elementId);
    element?.scrollIntoView({ behavior: "smooth", block: "center" });
    if (element instanceof HTMLElement) {
      element.focus({ preventScroll: true });
    }
  }, [fieldErrors, state.ok]);

  const patchField =
    <K extends keyof DebtCaseFormDefaults>(key: K) =>
    (event: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
      setFormValues((prev) => ({ ...prev, [key]: event.target.value as DebtCaseFormDefaults[K] }));
    };

  const ownerFields = [
    {
      fullName: "owner0FullName" as const,
      mobile: "owner0Mobile" as const,
      identityType: "owner0IdentityType" as const,
      identityNumber: "owner0IdentityNumber" as const,
      email: "owner0Email" as const,
    },
    {
      fullName: "owner1FullName" as const,
      mobile: "owner1Mobile" as const,
      identityType: "owner1IdentityType" as const,
      identityNumber: "owner1IdentityNumber" as const,
      email: "owner1Email" as const,
    },
  ];

  function handleFormSubmit(event: React.FormEvent<HTMLFormElement>) {
    const native = event.nativeEvent as SubmitEvent;
    const submitter = native.submitter;
    if (
      submitter instanceof HTMLButtonElement &&
      submitter.name === "intent" &&
      submitter.value === "submit"
    ) {
      const confirmed = window.confirm(
        "לשלוח את התיק לבדיקת עורך הדין? לא ניתן לערוך את התיק לאחר השליחה עד להחזרה או החלטה.",
      );
      if (!confirmed) {
        event.preventDefault();
      }
    }
  }

  return (
    <div>
      {!editable ? (
        <p className={styles.readonlyBanner} role="status">
          התיק אינו ניתן לעריכה במצב הנוכחי (למשל לאחר שליחת מכתב או לאחר סגירה).
        </p>
      ) : null}

      {!state.ok && hasFieldErrors ? (
        <div className={styles.validationSummary} role="alert">
          <p>{state.message}</p>
          {Object.keys(fieldErrors!).length > 1 ? (
            <ul>
              {Object.entries(fieldErrors!).map(([key, message]) => (
                <li key={key}>{message}</li>
              ))}
            </ul>
          ) : null}
          {formLevelErrors.length > 0 ? (
            <div>
              {formLevelErrors.map(([key, message]) => (
                <p key={key}>{message}</p>
              ))}
            </div>
          ) : null}
        </div>
      ) : state.message ? (
        <p className={state.ok ? styles.feedbackSuccess : styles.feedbackError} role="status">
          {state.message}
        </p>
      ) : null}

      {state.flags && state.flags.length > 0 ? (
        <div className={styles.flags} aria-live="polite">
          <p className={styles.label}>בדיקות והערות</p>
          <ul>
            {state.flags.map((flag, index) => (
              <li key={`${flag.code}-${index}`} className={styles.flagItem}>
                [{formatValidationSeverityHe(flag.severity)}] {flag.messageHe}
              </li>
            ))}
          </ul>
          <p className={styles.meta}>
            הגשה לבדיקת עורך דין אינה שולחת מכתב. אם הבניין אינו מוכן משפטית, תוצגנה אזהרות.
          </p>
        </div>
      ) : null}

      <form
        action={formAction}
        className={compactLayout ? `${styles.form} ${styles.formCompact}` : styles.form}
        onSubmit={handleFormSubmit}
      >
        <input type="hidden" name="buildingId" value={buildingId} />
        <input type="hidden" name="debtCaseId" value={record.debtCaseId} />
        <input type="hidden" name="revision" value={revision} />

        <div className={styles.fieldGrid}>
          <div className={styles.fieldFull}>
            <label className={styles.label} htmlFor="apartmentNumber">
              מספר דירה
            </label>
            <input
              id="apartmentNumber"
              name="apartmentNumber"
              className={controlClassName("apartmentNumber", fieldErrors, "input")}
              value={formValues.apartmentNumber}
              onChange={patchField("apartmentNumber")}
              disabled={!editable}
              {...fieldAriaProps("apartmentNumber", fieldErrors)}
            />
            <FieldError name="apartmentNumber" errors={fieldErrors} />
          </div>

          <div className={styles.fieldFull}>
            <h3 className={styles.subsectionTitle}>בעלי דירה</h3>
            <FieldError name="propertyOwners" errors={fieldErrors} />
          </div>

          {ownerFields.map((owner, index) => (
            <div key={index} className={styles.fieldFull}>
              <h4 className={styles.label}>{index === 0 ? "בעלים ראשון" : "בעלים שני (אופציונלי)"}</h4>
              <div className={styles.fieldGrid}>
                <div>
                  <label className={styles.label} htmlFor={`owner${index}-name`}>
                    שם מלא
                  </label>
                  <input
                    id={`owner${index}-name`}
                    name={`propertyOwners.${index}.fullName`}
                    className={controlClassName(
                      `propertyOwners.${index}.fullName`,
                      fieldErrors,
                      "input",
                    )}
                    value={formValues[owner.fullName]}
                    onChange={patchField(owner.fullName)}
                    disabled={!editable}
                    {...fieldAriaProps(`propertyOwners.${index}.fullName`, fieldErrors)}
                  />
                  <FieldError name={`propertyOwners.${index}.fullName`} errors={fieldErrors} />
                </div>
                <div>
                  <label className={styles.label} htmlFor={`owner${index}-mobile`}>
                    נייד
                  </label>
                  <input
                    id={`owner${index}-mobile`}
                    name={`propertyOwners.${index}.mobile`}
                    className={controlClassName(
                      `propertyOwners.${index}.mobile`,
                      fieldErrors,
                      "input",
                    )}
                    value={formValues[owner.mobile]}
                    onChange={patchField(owner.mobile)}
                    disabled={!editable}
                    inputMode="tel"
                    {...fieldAriaProps(`propertyOwners.${index}.mobile`, fieldErrors)}
                  />
                  <FieldError name={`propertyOwners.${index}.mobile`} errors={fieldErrors} />
                </div>
                <div>
                  <label className={styles.label} htmlFor={`owner${index}-id-type`}>
                    סוג מסמך זיהוי
                  </label>
                  <select
                    id={`owner${index}-id-type`}
                    name={`propertyOwners.${index}.identityDocumentType`}
                    className={controlClassName(
                      `propertyOwners.${index}.identityDocumentType`,
                      fieldErrors,
                      "select",
                    )}
                    value={formValues[owner.identityType]}
                    onChange={patchField(owner.identityType)}
                    disabled={!editable}
                    {...fieldAriaProps(`propertyOwners.${index}.identityDocumentType`, fieldErrors)}
                  >
                    <option value="">—</option>
                    <option value={DebtCaseIdentityDocumentType.ISRAELI_ID}>ת.ז.</option>
                    <option value={DebtCaseIdentityDocumentType.COMPANY_HP}>ח.פ.</option>
                  </select>
                  <FieldError
                    name={`propertyOwners.${index}.identityDocumentType`}
                    errors={fieldErrors}
                  />
                </div>
                <div>
                  <label className={styles.label} htmlFor={`owner${index}-id-number`}>
                    מספר זיהוי
                  </label>
                  <input
                    id={`owner${index}-id-number`}
                    name={`propertyOwners.${index}.identityNumber`}
                    className={controlClassName(
                      `propertyOwners.${index}.identityNumber`,
                      fieldErrors,
                      "input",
                    )}
                    value={formValues[owner.identityNumber]}
                    onChange={patchField(owner.identityNumber)}
                    disabled={!editable}
                    {...fieldAriaProps(`propertyOwners.${index}.identityNumber`, fieldErrors)}
                  />
                  <FieldError
                    name={`propertyOwners.${index}.identityNumber`}
                    errors={fieldErrors}
                  />
                </div>
                <input
                  type="hidden"
                  name={`propertyOwners.${index}.email`}
                  value={formValues[owner.email]}
                />
              </div>
            </div>
          ))}

          <div>
            <label className={styles.label} htmlFor="occupancyType">
              מצב אכלוס
            </label>
            <select
              id="occupancyType"
              name="occupancyType"
              className={controlClassName("occupancyType", fieldErrors, "select")}
              value={formValues.occupancyType}
              onChange={(event) => {
                const next = event.target.value as DebtCaseOccupancyType;
                setOccupancyType(next);
                if (next === DebtCaseOccupancyType.OWNER) {
                  setFormValues((prev) => {
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
                setFormValues((prev) => {
                  const parked = parkedTenantRef.current;
                  if (!parked) {
                    return { ...prev, occupancyType: next };
                  }
                  parkedTenantRef.current = null;
                  return {
                    ...prev,
                    occupancyType: next,
                    ...parked,
                  };
                });
              }}
              disabled={!editable}
              {...fieldAriaProps("occupancyType", fieldErrors)}
            >
              <option value={DebtCaseOccupancyType.OWNER}>בעלות</option>
              <option value={DebtCaseOccupancyType.TENANT}>שוכר</option>
            </select>
            <FieldError name="occupancyType" errors={fieldErrors} />
          </div>

          <div>
            <label className={styles.label} htmlFor="legalDebtorDesignation">
              חייב משפטי
            </label>
            <select
              id="legalDebtorDesignation"
              name="legalDebtorDesignation"
              className={controlClassName("legalDebtorDesignation", fieldErrors, "select")}
              value={formValues.legalDebtorDesignation}
              onChange={patchField("legalDebtorDesignation")}
              disabled={!editable}
              {...fieldAriaProps("legalDebtorDesignation", fieldErrors)}
            >
              <option value={LegalDebtorDesignation.PROPERTY_OWNERS}>בעלי הדירה</option>
              <option value={LegalDebtorDesignation.TENANT}>השוכר</option>
            </select>
            <FieldError name="legalDebtorDesignation" errors={fieldErrors} />
          </div>

          {showTenant ? (
            <div className={styles.fieldFull}>
              <h3 className={styles.subsectionTitle}>פרטי שוכר</h3>
              <FieldError name="tenant" errors={fieldErrors} />
              <div className={styles.fieldGrid}>
                <div>
                  <label className={styles.label} htmlFor="tenant-fullName">
                    שם שוכר
                  </label>
                  <input
                    id="tenant-fullName"
                    name="tenant.fullName"
                    className={controlClassName("tenant.fullName", fieldErrors, "input")}
                    value={formValues.tenantFullName}
                    onChange={patchField("tenantFullName")}
                    disabled={!editable}
                    {...fieldAriaProps("tenant.fullName", fieldErrors)}
                  />
                  <FieldError name="tenant.fullName" errors={fieldErrors} />
                </div>
                <div>
                  <label className={styles.label} htmlFor="tenant-mobile">
                    נייד שוכר
                  </label>
                  <input
                    id="tenant-mobile"
                    name="tenant.mobile"
                    className={controlClassName("tenant.mobile", fieldErrors, "input")}
                    value={formValues.tenantMobile}
                    onChange={patchField("tenantMobile")}
                    disabled={!editable}
                    {...fieldAriaProps("tenant.mobile", fieldErrors)}
                  />
                  <FieldError name="tenant.mobile" errors={fieldErrors} />
                </div>
                <div>
                  <label className={styles.label} htmlFor="tenant-id-type">
                    סוג מסמך זיהוי
                  </label>
                  <select
                    id="tenant-id-type"
                    name="tenant.identityDocumentType"
                    className={controlClassName("tenant.identityDocumentType", fieldErrors, "select")}
                    value={formValues.tenantIdentityType}
                    onChange={patchField("tenantIdentityType")}
                    disabled={!editable}
                    {...fieldAriaProps("tenant.identityDocumentType", fieldErrors)}
                  >
                    <option value="">—</option>
                    <option value={DebtCaseIdentityDocumentType.ISRAELI_ID}>ת.ז.</option>
                    <option value={DebtCaseIdentityDocumentType.COMPANY_HP}>ח.פ.</option>
                  </select>
                  <FieldError name="tenant.identityDocumentType" errors={fieldErrors} />
                </div>
                <div>
                  <label className={styles.label} htmlFor="tenant-id-number">
                    מספר זיהוי
                  </label>
                  <input
                    id="tenant-id-number"
                    name="tenant.identityNumber"
                    className={controlClassName("tenant.identityNumber", fieldErrors, "input")}
                    value={formValues.tenantIdentityNumber}
                    onChange={patchField("tenantIdentityNumber")}
                    disabled={!editable}
                    {...fieldAriaProps("tenant.identityNumber", fieldErrors)}
                  />
                  <FieldError name="tenant.identityNumber" errors={fieldErrors} />
                </div>
                <input type="hidden" name="tenant.email" value={formValues.tenantEmail} />
              </div>
            </div>
          ) : (
            <>
              <input type="hidden" name="tenant.fullName" value={formValues.tenantFullName} />
              <input type="hidden" name="tenant.mobile" value={formValues.tenantMobile} />
              <input
                type="hidden"
                name="tenant.identityDocumentType"
                value={formValues.tenantIdentityType}
              />
              <input type="hidden" name="tenant.identityNumber" value={formValues.tenantIdentityNumber} />
              <input type="hidden" name="tenant.email" value={formValues.tenantEmail} />
            </>
          )}

          <div className={styles.fieldFull}>
            <label className={styles.label} htmlFor="postalAddress">
              כתובת למכתבים (אם שונה)
            </label>
            <input
              id="postalAddress"
              name="postalAddress"
              className={controlClassName("postalAddress", fieldErrors, "input")}
              value={formValues.postalAddress}
              onChange={patchField("postalAddress")}
              disabled={!editable}
              {...fieldAriaProps("postalAddress", fieldErrors)}
            />
            <FieldError name="postalAddress" errors={fieldErrors} />
          </div>

          <div>
            <label className={styles.label} htmlFor="debtType">
              סוג חוב
            </label>
            <select
              id="debtType"
              name="debtType"
              className={controlClassName("debtType", fieldErrors, "select")}
              value={formValues.debtType}
              onChange={(event) => {
                const next = event.target.value as DebtCaseDebtType;
                setDebtType(next);
                patchField("debtType")(event);
              }}
              disabled={!editable}
              {...fieldAriaProps("debtType", fieldErrors)}
            >
              <option value={DebtCaseDebtType.REGULAR_VAAD}>דמי ועד שוטפים</option>
              <option value={DebtCaseDebtType.SPECIAL_ASSESSMENT}>חיוב מיוחד</option>
            </select>
            <FieldError name="debtType" errors={fieldErrors} />
          </div>

          {showSpecial ? (
            <div className={styles.fieldFull}>
              <label className={styles.label} htmlFor="specialAssessmentDescription">
                תיאור חיוב מיוחד
              </label>
              <textarea
                id="specialAssessmentDescription"
                name="specialAssessmentDescription"
                className={controlClassName("specialAssessmentDescription", fieldErrors, "textarea")}
                value={formValues.specialAssessmentDescription}
                onChange={patchField("specialAssessmentDescription")}
                disabled={!editable}
                {...fieldAriaProps("specialAssessmentDescription", fieldErrors)}
              />
              <FieldError name="specialAssessmentDescription" errors={fieldErrors} />
            </div>
          ) : (
            <input
              type="hidden"
              name="specialAssessmentDescription"
              value={formValues.specialAssessmentDescription}
            />
          )}

          <div>
            <label className={styles.label} htmlFor="principalAmountNis">
              סכום כולל (₪)
            </label>
            <input
              id="principalAmountNis"
              name="principalAmountNis"
              className={controlClassName("principalAmountNis", fieldErrors, "input")}
              inputMode="decimal"
              value={formValues.principalAmountNis}
              onChange={patchField("principalAmountNis")}
              disabled={!editable}
              {...fieldAriaProps("principalAmountNis", fieldErrors)}
            />
            <FieldError name="principalAmountNis" errors={fieldErrors} />
          </div>

          <div>
            <label className={styles.label} htmlFor="periodStartMonth">
              תחילת תקופה (YYYY-MM)
            </label>
            <input
              id="periodStartMonth"
              name="periodStartMonth"
              className={controlClassName("periodStartMonth", fieldErrors, "input")}
              placeholder="2024-01"
              value={formValues.periodStartMonth}
              onChange={patchField("periodStartMonth")}
              disabled={!editable}
              {...fieldAriaProps("periodStartMonth", fieldErrors)}
            />
            <FieldError name="periodStartMonth" errors={fieldErrors} />
          </div>

          <div>
            <label className={styles.label} htmlFor="periodEndMonth">
              סיום תקופה (YYYY-MM)
            </label>
            <input
              id="periodEndMonth"
              name="periodEndMonth"
              className={controlClassName("periodEndMonth", fieldErrors, "input")}
              placeholder="2024-06"
              value={formValues.periodEndMonth}
              onChange={patchField("periodEndMonth")}
              disabled={!editable}
              {...fieldAriaProps("periodEndMonth", fieldErrors)}
            />
            <FieldError name="periodEndMonth" errors={fieldErrors} />
          </div>
        </div>

        {editable ? (
          <div className={styles.actions}>
            <Button type="submit" name="intent" value="save" variant="secondary" disabled={pending}>
              {pending ? "מעבד…" : "שמירת טיוטה"}
            </Button>
            <Button type="submit" name="intent" value="preview" variant="secondary" disabled={pending}>
              בדיקה לפני הגשה
            </Button>
            <Button type="submit" name="intent" value="submit" disabled={pending}>
              הגשה לבדיקת עורך דין
            </Button>
          </div>
        ) : null}
      </form>
    </div>
  );
}
