import { DebtCaseOccupancyType } from "@/modules/debt-cases/domain/debt-case-occupancy-type";
import type { DebtCaseIdentityDocumentType } from "@/modules/debt-cases/domain/debt-case-identity-document";

/** Who is registered as bearing the debt for collection — explicit, never inferred from occupancy alone. */
export const LegalDebtorDesignation = {
  PROPERTY_OWNERS: "property_owners",
  TENANT: "tenant",
} as const;

export type LegalDebtorDesignation =
  (typeof LegalDebtorDesignation)[keyof typeof LegalDebtorDesignation];

export type PropertyOwnerParty = {
  fullName: string;
  identityDocumentType: DebtCaseIdentityDocumentType | null;
  identityNumber: string | null;
  mobileE164: string | null;
  email: string | null;
};

export type TenantParty = {
  fullName: string;
  identityDocumentType: DebtCaseIdentityDocumentType | null;
  identityNumber: string | null;
  mobileE164: string;
  email: string | null;
};

/** Structured parties on a debt case (no separate debtor collection). */
export type DebtCasePartyStructure = {
  propertyOwners: readonly PropertyOwnerParty[];
  occupancyType: DebtCaseOccupancyType;
  legalDebtorDesignation: LegalDebtorDesignation;
  /** Present when the apartment is tenant-occupied; not automatically the legal debtor. */
  tenant: TenantParty | null;
  /** Correspondence when different from the apartment address. */
  postalAddress: string | null;
};

export type LetterRecipientRole = "property_owner" | "tenant";

export type LetterRecipient = {
  role: LetterRecipientRole;
  fullName: string;
  mobileE164: string;
};

/**
 * Future letter module: one letter, multiple recipients when tenant-occupied (lawyer questionnaire).
 * Does not assign legal liability.
 */
export function resolveLetterRecipients(parties: DebtCasePartyStructure): LetterRecipient[] {
  const recipients: LetterRecipient[] = [];

  if (parties.occupancyType === DebtCaseOccupancyType.TENANT && parties.tenant) {
    recipients.push({
      role: "tenant",
      fullName: parties.tenant.fullName,
      mobileE164: parties.tenant.mobileE164,
    });
    for (const owner of parties.propertyOwners) {
      if (owner.mobileE164) {
        recipients.push({
          role: "property_owner",
          fullName: owner.fullName,
          mobileE164: owner.mobileE164,
        });
      }
    }
    return recipients;
  }

  for (const owner of parties.propertyOwners) {
    if (owner.mobileE164) {
      recipients.push({
        role: "property_owner",
        fullName: owner.fullName,
        mobileE164: owner.mobileE164,
      });
    }
  }
  return recipients;
}

/** Primary contact mobile used for operator/debtor phone validation flags. */
export function resolvePrimaryDebtorContactMobileE164(
  parties: DebtCasePartyStructure,
): string | null {
  if (parties.legalDebtorDesignation === LegalDebtorDesignation.TENANT && parties.tenant) {
    return parties.tenant.mobileE164;
  }
  const ownerWithMobile = parties.propertyOwners.find((o) => o.mobileE164);
  return ownerWithMobile?.mobileE164 ?? null;
}

/** Display name for repeat-debtor matching (legal debtor side). */
export function resolveLegalDebtorMatchingLabel(parties: DebtCasePartyStructure): string {
  if (parties.legalDebtorDesignation === LegalDebtorDesignation.TENANT && parties.tenant) {
    return parties.tenant.fullName;
  }
  return parties.propertyOwners.map((o) => o.fullName).join(" ");
}

export function normalizePartyNameForMatching(name: string): string {
  return name.trim().replace(/\s+/g, " ").toLowerCase();
}

export function assertLegalDebtorDesignationConsistent(parties: {
  occupancyType: DebtCaseOccupancyType;
  legalDebtorDesignation: LegalDebtorDesignation;
  tenant: TenantParty | null;
}): boolean {
  if (parties.occupancyType === DebtCaseOccupancyType.OWNER) {
    return parties.legalDebtorDesignation === LegalDebtorDesignation.PROPERTY_OWNERS;
  }
  if (parties.occupancyType === DebtCaseOccupancyType.TENANT) {
    return parties.tenant != null;
  }
  return false;
}
