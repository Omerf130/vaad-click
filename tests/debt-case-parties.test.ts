import { describe, expect, it } from "vitest";

import { DebtCaseOccupancyType } from "@/modules/debt-cases/domain/debt-case-occupancy-type";
import {
  LegalDebtorDesignation,
  resolveLegalDebtorMatchingLabel,
  resolveLetterRecipients,
  resolvePrimaryDebtorContactMobileE164,
} from "@/modules/debt-cases/domain/debt-case-parties";

describe("debt case parties", () => {
  it("resolves letter recipients for tenant occupancy (tenant + owners)", () => {
    const recipients = resolveLetterRecipients({
      propertyOwners: [
        {
          fullName: "Owner One",
          identityDocumentType: null,
          identityNumber: null,
          mobileE164: "+972501111111",
          email: null,
        },
      ],
      occupancyType: DebtCaseOccupancyType.TENANT,
      legalDebtorDesignation: LegalDebtorDesignation.PROPERTY_OWNERS,
      tenant: {
        fullName: "Tenant",
        identityDocumentType: null,
        identityNumber: null,
        mobileE164: "+972502222222",
        email: null,
      },
      postalAddress: null,
    });
    expect(recipients).toHaveLength(2);
    expect(recipients.map((r) => r.role).sort()).toEqual(["property_owner", "tenant"]);
  });

  it("uses legal debtor designation for matching label and primary mobile", () => {
    const parties = {
      propertyOwners: [
        {
          fullName: "Owner A",
          identityDocumentType: null,
          identityNumber: null,
          mobileE164: "+972501111111",
          email: null,
        },
        {
          fullName: "Owner B",
          identityDocumentType: null,
          identityNumber: null,
          mobileE164: null,
          email: null,
        },
      ],
      occupancyType: DebtCaseOccupancyType.TENANT,
      legalDebtorDesignation: LegalDebtorDesignation.TENANT,
      tenant: {
        fullName: "Tenant X",
        identityDocumentType: null,
        identityNumber: null,
        mobileE164: "+972502222222",
        email: null,
      },
      postalAddress: null,
    };
    expect(resolveLegalDebtorMatchingLabel(parties)).toBe("Tenant X");
    expect(resolvePrimaryDebtorContactMobileE164(parties)).toBe("+972502222222");
  });

  it("joins two owner names for legal debtor matching when owners are designated", () => {
    const parties = {
      propertyOwners: [
        {
          fullName: "Owner A",
          identityDocumentType: null,
          identityNumber: null,
          mobileE164: "+972501111111",
          email: null,
        },
        {
          fullName: "Owner B",
          identityDocumentType: null,
          identityNumber: null,
          mobileE164: "+972503333333",
          email: null,
        },
      ],
      occupancyType: DebtCaseOccupancyType.OWNER,
      legalDebtorDesignation: LegalDebtorDesignation.PROPERTY_OWNERS,
      tenant: null,
      postalAddress: null,
    };
    expect(resolveLegalDebtorMatchingLabel(parties)).toBe("Owner A Owner B");
  });
});
