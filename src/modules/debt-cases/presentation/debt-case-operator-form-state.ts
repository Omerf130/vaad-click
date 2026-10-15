import type { DebtCaseFormDefaults } from "@/modules/debt-cases/presentation/debt-case-form.defaults";

export type DebtCaseFormIntent = "save" | "preview" | "submit";

export function cloneDebtCaseFormDefaults(source: DebtCaseFormDefaults): DebtCaseFormDefaults {
  return { ...source };
}

/** Client-held values after a Server Action — preview and validation failures never clear input. */
export function formValuesAfterServerAction(input: {
  currentValues: DebtCaseFormDefaults;
  actionOk: boolean;
  lastIntent?: DebtCaseFormIntent;
}): DebtCaseFormDefaults {
  if (input.lastIntent === "preview") {
    return input.currentValues;
  }
  if (!input.actionOk) {
    return input.currentValues;
  }
  return input.currentValues;
}

export function shouldHydrateFormFromServerDefaults(input: {
  previousDebtCaseId: string;
  nextDebtCaseId: string;
  formIsEditable: boolean;
  becameReadOnly: boolean;
}): boolean {
  if (input.previousDebtCaseId !== input.nextDebtCaseId) {
    return true;
  }
  if (input.becameReadOnly) {
    return true;
  }
  return false;
}

export function shouldApplyServerDefaultsAfterSave(input: {
  lastIntent?: DebtCaseFormIntent;
  actionOk: boolean;
  returnedRevision?: number;
  syncedRevision: number;
  serverRevision: number;
}): boolean {
  return (
    input.actionOk &&
    input.lastIntent === "save" &&
    input.returnedRevision != null &&
    input.returnedRevision !== input.syncedRevision &&
    input.serverRevision === input.returnedRevision
  );
}

/** Build FormData from client-held values (same shape the operator form submits). */
export function debtCaseFormDefaultsToFormData(
  values: DebtCaseFormDefaults,
  meta: {
    buildingId: string;
    debtCaseId: string;
    revision: number;
    intent: DebtCaseFormIntent;
  },
): FormData {
  const formData = new FormData();
  formData.set("buildingId", meta.buildingId);
  formData.set("debtCaseId", meta.debtCaseId);
  formData.set("revision", String(meta.revision));
  formData.set("intent", meta.intent);
  formData.set("apartmentNumber", values.apartmentNumber);
  formData.set("propertyOwners.0.fullName", values.owner0FullName);
  formData.set("propertyOwners.0.mobile", values.owner0Mobile);
  formData.set("propertyOwners.0.identityDocumentType", values.owner0IdentityType);
  formData.set("propertyOwners.0.identityNumber", values.owner0IdentityNumber);
  formData.set("propertyOwners.0.email", values.owner0Email);
  formData.set("propertyOwners.1.fullName", values.owner1FullName);
  formData.set("propertyOwners.1.mobile", values.owner1Mobile);
  formData.set("propertyOwners.1.identityDocumentType", values.owner1IdentityType);
  formData.set("propertyOwners.1.identityNumber", values.owner1IdentityNumber);
  formData.set("propertyOwners.1.email", values.owner1Email);
  formData.set("occupancyType", values.occupancyType);
  formData.set("legalDebtorDesignation", values.legalDebtorDesignation);
  formData.set("tenant.fullName", values.tenantFullName);
  formData.set("tenant.mobile", values.tenantMobile);
  formData.set("tenant.identityDocumentType", values.tenantIdentityType);
  formData.set("tenant.identityNumber", values.tenantIdentityNumber);
  formData.set("tenant.email", values.tenantEmail);
  formData.set("postalAddress", values.postalAddress);
  formData.set("debtType", values.debtType);
  formData.set("specialAssessmentDescription", values.specialAssessmentDescription);
  formData.set("principalAmountNis", values.principalAmountNis);
  formData.set("periodStartMonth", values.periodStartMonth);
  formData.set("periodEndMonth", values.periodEndMonth);
  return formData;
}
