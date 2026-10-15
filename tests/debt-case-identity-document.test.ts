import { describe, expect, it } from "vitest";

import {
  DebtCaseIdentityDocumentType,
  isValidIsraeliIdChecksum,
  validateOptionalIdentityDocument,
} from "@/modules/debt-cases/domain/debt-case-identity-document";

describe("debt case identity document", () => {
  it("accepts empty optional identity", () => {
    expect(validateOptionalIdentityDocument({ documentType: null, documentNumber: null }).ok).toBe(
      true,
    );
  });

  it("validates known Israeli ID checksum when type is israeli_id", () => {
    expect(isValidIsraeliIdChecksum("000000018")).toBe(true);
    expect(
      validateOptionalIdentityDocument({
        documentType: DebtCaseIdentityDocumentType.ISRAELI_ID,
        documentNumber: "000000018",
      }).ok,
    ).toBe(true);
  });

  it("rejects partial identity (type without number or vice versa)", () => {
    expect(
      validateOptionalIdentityDocument({
        documentType: DebtCaseIdentityDocumentType.ISRAELI_ID,
        documentNumber: null,
      }).ok,
    ).toBe(false);
    expect(
      validateOptionalIdentityDocument({
        documentType: null,
        documentNumber: "000000018",
      }).ok,
    ).toBe(false);
  });

  it("does not treat invalid-checksum 9 digits as Israeli ID", () => {
    expect(
      validateOptionalIdentityDocument({
        documentType: DebtCaseIdentityDocumentType.ISRAELI_ID,
        documentNumber: "123456789",
      }).ok,
    ).toBe(false);
  });

  it("accepts company HP with explicit type without teudat zehut checksum", () => {
    expect(
      validateOptionalIdentityDocument({
        documentType: DebtCaseIdentityDocumentType.COMPANY_HP,
        documentNumber: "123456789",
      }).ok,
    ).toBe(true);
  });
});
