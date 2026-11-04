import { describe, expect, it } from "vitest";

import { DebtCaseDebtType } from "@/modules/debt-cases/domain/debt-case-debt-type";
import { DebtCaseOccupancyType } from "@/modules/debt-cases/domain/debt-case-occupancy-type";
import { emptyDebtCaseFormDefaults } from "@/modules/debt-cases/presentation/debt-case-form.defaults";
import {
  buildCaseDraftPayloadFromFormValues,
  buildIntakeSavePayload,
  caseDraftJsonToFormDefaults,
  INTAKE_WIZARD_STEP_COUNT,
  nextIntakeWizardStep,
  prevIntakeWizardStep,
} from "@/modules/debt-cases/presentation/debt-case-intake-form.state";
import { debtCaseIntakeDraftSaveSchema } from "@/modules/debt-cases/validation/debt-case-intake.schema";
import { intakeBuildingSchema } from "@/modules/debt-cases/validation/debt-case-intake.schema";

describe("intake wizard step navigation", () => {
  it("advances and retreats without skipping bounds", () => {
    expect(nextIntakeWizardStep(0)).toBe(1);
    expect(INTAKE_WIZARD_STEP_COUNT).toBe(6);
    expect(nextIntakeWizardStep(INTAKE_WIZARD_STEP_COUNT - 1)).toBe(INTAKE_WIZARD_STEP_COUNT - 1);
    expect(prevIntakeWizardStep(0)).toBe(0);
    expect(prevIntakeWizardStep(3)).toBe(2);
  });
});

describe("intake form state payload", () => {
  it("preserves entered values in save payload", () => {
    const caseForm = emptyDebtCaseFormDefaults();
    caseForm.apartmentNumber = "12";
    caseForm.owner0FullName = "ישראל";
    caseForm.principalAmountNis = "1500";
    caseForm.debtType = DebtCaseDebtType.REGULAR_VAAD;
    caseForm.occupancyType = DebtCaseOccupancyType.OWNER;

    const payload = buildIntakeSavePayload({
      expectedRevision: 2,
      intakeDraftId: "11111111-1111-4111-8111-111111111111",
      lockedBuilding: false,
      buildingMode: "new",
      existingBuildingId: "",
      buildingFields: {
        displayName: "מגדל",
        city: "חיפה",
        street: "הנביאים",
        houseNumber: "5",
        postalCode: "",
      },
      caseForm,
      platformFeePreference: null,
    });

    const parsed = debtCaseIntakeDraftSaveSchema.safeParse(payload);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.caseDraft.apartmentNumber).toBe("12");
      expect(parsed.data.building.mode).toBe("new");
      if (parsed.data.building.mode === "new") {
        expect(parsed.data.building.address?.city).toBe("חיפה");
      }
    }
  });

  it("round-trips case draft json through form defaults", () => {
    const json = buildCaseDraftPayloadFromFormValues({
      ...emptyDebtCaseFormDefaults(),
      apartmentNumber: "7",
      owner0FullName: "דנה",
      owner0Mobile: "0501234567",
    });
    const restored = caseDraftJsonToFormDefaults(json);
    expect(restored.apartmentNumber).toBe("7");
    expect(restored.owner0FullName).toBe("דנה");
    expect(restored.owner0Mobile).toBe("0501234567");
  });

  it("allows partial draft save from intermediate wizard data", () => {
    const payload = buildIntakeSavePayload({
      expectedRevision: 0,
      lockedBuilding: false,
      buildingMode: "new",
      existingBuildingId: "",
      buildingFields: {
        displayName: "",
        city: "תל אביב",
        street: "",
        houseNumber: "",
        postalCode: "",
      },
      caseForm: emptyDebtCaseFormDefaults(),
      platformFeePreference: null,
    });
    expect(debtCaseIntakeDraftSaveSchema.safeParse(payload).success).toBe(true);
  });
});

describe("submit building validation remains strict", () => {
  it("rejects incomplete building on submit schema", () => {
    expect(
      intakeBuildingSchema.safeParse({
        mode: "new",
        displayName: "שם",
        address: { city: "עיר", street: "", houseNumber: "" },
      }).success,
    ).toBe(false);
  });

  it("accepts complete building on submit schema", () => {
    expect(
      intakeBuildingSchema.safeParse({
        mode: "new",
        displayName: "שם",
        address: { city: "עיר", street: "רחוב", houseNumber: "1" },
      }).success,
    ).toBe(true);
  });
});
