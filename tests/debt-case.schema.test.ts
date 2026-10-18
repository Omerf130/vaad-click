import { describe, expect, it } from "vitest";

import { DebtCaseDebtType } from "@/modules/debt-cases/domain/debt-case-debt-type";
import { DebtCaseIdentityDocumentType } from "@/modules/debt-cases/domain/debt-case-identity-document";
import { DebtCaseOccupancyType } from "@/modules/debt-cases/domain/debt-case-occupancy-type";
import { LegalDebtorDesignation } from "@/modules/debt-cases/domain/debt-case-parties";
import {
  debtCaseDraftInputSchema,
  debtCaseSubmitInputSchema,
  mapSubmitInputToPartyStructure,
  parseApartmentFromDraftInput,
} from "@/modules/debt-cases/validation/debt-case.schema";

const BUILDING_ID = "11111111-1111-4111-8111-111111111111";

describe("debtCaseDraftInputSchema", () => {
  it("accepts minimal draft with building id only", () => {
    const result = debtCaseDraftInputSchema.safeParse({
      buildingId: BUILDING_ID,
      apartmentNumber: "",
    });
    expect(result.success).toBe(true);
  });

  it("accepts up to two structured property owners", () => {
    const result = debtCaseDraftInputSchema.safeParse({
      buildingId: BUILDING_ID,
      apartmentNumber: "12",
      propertyOwners: [
        { fullName: "ישראל ישראלי" },
        { fullName: "רחל ישראלי" },
      ],
    });
    expect(result.success).toBe(true);
  });
});

describe("debtCaseSubmitInputSchema", () => {
  const baseSubmit = {
    buildingId: BUILDING_ID,
    apartmentNumber: "12",
    propertyOwners: [
      {
        fullName: "ישראל ישראלי",
        mobile: "0501234567",
        identityDocumentType: null,
        identityNumber: null,
        email: null,
      },
    ],
    occupancyType: DebtCaseOccupancyType.OWNER,
    legalDebtorDesignation: LegalDebtorDesignation.PROPERTY_OWNERS,
    tenant: null,
    postalAddress: null,
    debtType: DebtCaseDebtType.REGULAR_VAAD,
    specialAssessmentDescription: null,
    principalAmountMinor: 50000,
    periodStartMonth: "2024-01",
    periodEndMonth: "2024-06",
    predecessorDebtCaseId: null,
  };

  it("requires owner mobile for owner occupancy", () => {
    const result = debtCaseSubmitInputSchema.safeParse({
      ...baseSubmit,
      propertyOwners: [{ ...baseSubmit.propertyOwners[0], mobile: "" }],
    });
    expect(result.success).toBe(false);
  });

  it("requires owner contact mobile when tenant-occupied", () => {
    const result = debtCaseSubmitInputSchema.safeParse({
      ...baseSubmit,
      occupancyType: DebtCaseOccupancyType.TENANT,
      legalDebtorDesignation: LegalDebtorDesignation.TENANT,
      propertyOwners: [{ ...baseSubmit.propertyOwners[0], mobile: null }],
      tenant: {
        fullName: "דוד שוכר",
        mobile: "0507654321",
        identityDocumentType: null,
        identityNumber: null,
        email: null,
      },
    });
    expect(result.success).toBe(false);
  });

  it("accepts tenant occupancy with owner mobiles and maps parties", () => {
    const result = debtCaseSubmitInputSchema.safeParse({
      ...baseSubmit,
      occupancyType: DebtCaseOccupancyType.TENANT,
      legalDebtorDesignation: LegalDebtorDesignation.TENANT,
      propertyOwners: [
        {
          fullName: "ישראל ישראלי",
          mobile: "0501111111",
          identityDocumentType: null,
          identityNumber: null,
          email: null,
        },
      ],
      tenant: {
        fullName: "דוד שוכר",
        mobile: "0507654321",
        identityDocumentType: null,
        identityNumber: null,
        email: null,
      },
    });
    expect(result.success).toBe(true);
    if (result.success) {
      const parties = mapSubmitInputToPartyStructure(result.data);
      expect(parties.tenant?.fullName).toBe("דוד שוכר");
      expect(parties.legalDebtorDesignation).toBe(LegalDebtorDesignation.TENANT);
      expect(parties.propertyOwners[0].mobileE164).toBe("+972501111111");
    }
  });

  it("allows tenant occupancy with legal debtor as property owners", () => {
    const result = debtCaseSubmitInputSchema.safeParse({
      ...baseSubmit,
      occupancyType: DebtCaseOccupancyType.TENANT,
      legalDebtorDesignation: LegalDebtorDesignation.PROPERTY_OWNERS,
      propertyOwners: [
        {
          fullName: "ישראל ישראלי",
          mobile: "0501111111",
          identityDocumentType: null,
          identityNumber: null,
          email: null,
        },
      ],
      tenant: {
        fullName: "דוד שוכר",
        mobile: "0507654321",
        identityDocumentType: null,
        identityNumber: null,
        email: null,
      },
    });
    expect(result.success).toBe(true);
  });

  it("accepts two owners with at least one mobile", () => {
    const result = debtCaseSubmitInputSchema.safeParse({
      ...baseSubmit,
      propertyOwners: [
        {
          fullName: "ישראל ישראלי",
          mobile: "0501234567",
          identityDocumentType: null,
          identityNumber: null,
          email: null,
        },
        {
          fullName: "רחל ישראלי",
          mobile: null,
          identityDocumentType: null,
          identityNumber: null,
          email: null,
        },
      ],
    });
    expect(result.success).toBe(true);
  });

  it("requires explicit identity type when number is provided", () => {
    const result = debtCaseSubmitInputSchema.safeParse({
      ...baseSubmit,
      propertyOwners: [
        {
          ...baseSubmit.propertyOwners[0],
          identityNumber: "000000018",
          identityDocumentType: null,
        },
      ],
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const typeIssue = result.error.issues.find(
        (issue) => issue.path.join(".") === "propertyOwners.0.identityDocumentType",
      );
      expect(typeIssue?.message).toBe("נדרש לבחור סוג מסמך זיהוי");
    }
  });

  it("validates Israeli ID only when type is israeli_id", () => {
    const invalidHpAsId = debtCaseSubmitInputSchema.safeParse({
      ...baseSubmit,
      propertyOwners: [
        {
          ...baseSubmit.propertyOwners[0],
          identityDocumentType: DebtCaseIdentityDocumentType.ISRAELI_ID,
          identityNumber: "123456789",
        },
      ],
    });
    expect(invalidHpAsId.success).toBe(false);
    if (!invalidHpAsId.success) {
      const idIssue = invalidHpAsId.error.issues.find(
        (issue) => issue.path.join(".") === "propertyOwners.0.identityNumber",
      );
      expect(idIssue?.message).toBe("מספר ת.ז. לא תקין");
    }

    const validHp = debtCaseSubmitInputSchema.safeParse({
      ...baseSubmit,
      propertyOwners: [
        {
          ...baseSubmit.propertyOwners[0],
          identityDocumentType: DebtCaseIdentityDocumentType.COMPANY_HP,
          identityNumber: "123456789",
        },
      ],
    });
    expect(validHp.success).toBe(true);
  });

  it("requires special assessment description", () => {
    const result = debtCaseSubmitInputSchema.safeParse({
      ...baseSubmit,
      debtType: DebtCaseDebtType.SPECIAL_ASSESSMENT,
      specialAssessmentDescription: "",
    });
    expect(result.success).toBe(false);
  });
});

describe("parseApartmentFromDraftInput", () => {
  it("normalizes geresh and whitespace for duplicate key", () => {
    const a = parseApartmentFromDraftInput("12 א");
    const b = parseApartmentFromDraftInput("12א");
    expect(a.apartmentNumberDisplay).toBe("12 א");
    expect(a.apartmentKeyNormalized).toBe(b.apartmentKeyNormalized);
  });
});
