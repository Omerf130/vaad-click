import { describe, expect, it } from "vitest";

import { DebtCaseDebtType } from "@/modules/debt-cases/domain/debt-case-debt-type";
import { DebtCaseOccupancyType } from "@/modules/debt-cases/domain/debt-case-occupancy-type";
import { LegalDebtorDesignation } from "@/modules/debt-cases/domain/debt-case-parties";
import {
  emptyDebtCaseFormDefaults,
  type DebtCaseFormDefaults,
} from "@/modules/debt-cases/presentation/debt-case-form.defaults";
import {
  cloneDebtCaseFormDefaults,
  debtCaseFormDefaultsToFormData,
  formValuesAfterServerAction,
  shouldApplyServerDefaultsAfterSave,
  shouldHydrateFormFromServerDefaults,
} from "@/modules/debt-cases/presentation/debt-case-operator-form-state";
import {
  parseDebtCaseFormDataToDraftPayload,
  parseDebtCaseFormDataToSubmitPayload,
} from "@/modules/debt-cases/validation/debt-case-form.parser";

const BUILDING_ID = "11111111-1111-4111-8111-111111111111";
const CASE_ID = "33333333-3333-4333-8333-333333333333";

function filledFormValues() {
  const base = emptyDebtCaseFormDefaults();
  return {
    ...base,
    apartmentNumber: "12",
    owner0FullName: "ישראל ישראלי",
    owner0Mobile: "0501234567",
    owner0Email: "owner@test.com",
    owner1FullName: "רחל ישראלי",
    owner1Mobile: "0507654321",
    occupancyType: DebtCaseOccupancyType.TENANT,
    legalDebtorDesignation: LegalDebtorDesignation.TENANT,
    tenantFullName: "דוד שוכר",
    tenantMobile: "0501111111",
    tenantEmail: "tenant@test.com",
    postalAddress: "רחוב 1, תל אביב",
    debtType: DebtCaseDebtType.SPECIAL_ASSESSMENT,
    specialAssessmentDescription: "תיקון גג",
    principalAmountNis: "500",
    periodStartMonth: "2024-01",
    periodEndMonth: "2024-06",
  };
}

describe("debt-case-operator-form-state", () => {
  it("keeps all values after successful preview", () => {
    const current = filledFormValues();
    const next = formValuesAfterServerAction({
      currentValues: current,
      actionOk: true,
      lastIntent: "preview",
    });
    expect(next).toEqual(current);
  });

  it("keeps all values after failed preview", () => {
    const current = filledFormValues();
    const next = formValuesAfterServerAction({
      currentValues: current,
      actionOk: false,
      lastIntent: "preview",
    });
    expect(next).toEqual(current);
  });

  it("preserves values across multiple successful preview actions", () => {
    let values: DebtCaseFormDefaults = filledFormValues();
    for (let i = 0; i < 3; i += 1) {
      values = formValuesAfterServerAction({
        currentValues: values,
        actionOk: true,
        lastIntent: "preview",
      });
    }
    expect(values).toEqual(filledFormValues());
  });

  it("round-trips every entered value through FormData for preview then submit", () => {
    const values = filledFormValues();
    const previewFormData = debtCaseFormDefaultsToFormData(values, {
      buildingId: BUILDING_ID,
      debtCaseId: CASE_ID,
      revision: 2,
      intent: "preview",
    });
    const submitFormData = debtCaseFormDefaultsToFormData(values, {
      buildingId: BUILDING_ID,
      debtCaseId: CASE_ID,
      revision: 2,
      intent: "submit",
    });

    const previewPayload = parseDebtCaseFormDataToSubmitPayload({
      formData: previewFormData,
      buildingId: BUILDING_ID,
    });
    const submitPayload = parseDebtCaseFormDataToSubmitPayload({
      formData: submitFormData,
      buildingId: BUILDING_ID,
    });

    expect(submitPayload.apartmentNumber).toBe(previewPayload.apartmentNumber);
    expect(submitPayload.propertyOwners?.[0]?.fullName).toBe(
      previewPayload.propertyOwners?.[0]?.fullName,
    );
    expect(submitPayload.tenant?.fullName).toBe(previewPayload.tenant?.fullName);
    expect(submitPayload.principalAmountMinor).toBe(previewPayload.principalAmountMinor);
    expect(submitPayload.periodStartMonth).toBe(previewPayload.periodStartMonth);
    expect(parseDebtCaseFormDataToDraftPayload({ formData: previewFormData, buildingId: BUILDING_ID }).postalAddress).toBe(
      values.postalAddress,
    );
  });

  it("does not send tenant party when occupancy is owner (empty tenant fields)", () => {
    const values = {
      ...filledFormValues(),
      occupancyType: DebtCaseOccupancyType.OWNER,
      legalDebtorDesignation: LegalDebtorDesignation.PROPERTY_OWNERS,
      tenantFullName: "",
      tenantMobile: "",
      tenantIdentityType: "",
      tenantIdentityNumber: "",
      tenantEmail: "",
    };
    const formData = debtCaseFormDefaultsToFormData(values, {
      buildingId: BUILDING_ID,
      debtCaseId: CASE_ID,
      revision: 0,
      intent: "submit",
    });
    const payload = parseDebtCaseFormDataToDraftPayload({ formData, buildingId: BUILDING_ID });
    expect(payload.tenant).toBeNull();
  });

  it("does not hydrate from server defaults on mere revision prop change without save intent", () => {
    expect(
      shouldApplyServerDefaultsAfterSave({
        lastIntent: "preview",
        actionOk: true,
        returnedRevision: 3,
        syncedRevision: 2,
        serverRevision: 3,
      }),
    ).toBe(false);
  });

  it("hydrates when navigating to a different debt case", () => {
    expect(
      shouldHydrateFormFromServerDefaults({
        previousDebtCaseId: "aaa",
        nextDebtCaseId: "bbb",
        formIsEditable: true,
        becameReadOnly: false,
      }),
    ).toBe(true);
  });

  it("does not hydrate on initial mount for the same case", () => {
    expect(
      shouldHydrateFormFromServerDefaults({
        previousDebtCaseId: CASE_ID,
        nextDebtCaseId: CASE_ID,
        formIsEditable: true,
        becameReadOnly: false,
      }),
    ).toBe(false);
  });

  it("cloneDebtCaseFormDefaults produces an independent copy", () => {
    const source = filledFormValues();
    const copy = cloneDebtCaseFormDefaults(source);
    copy.apartmentNumber = "99";
    expect(source.apartmentNumber).toBe("12");
  });
});
