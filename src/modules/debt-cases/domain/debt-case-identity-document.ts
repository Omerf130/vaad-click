export const DebtCaseIdentityDocumentType = {
  ISRAELI_ID: "israeli_id",
  COMPANY_HP: "company_hp",
} as const;

export type DebtCaseIdentityDocumentType =
  (typeof DebtCaseIdentityDocumentType)[keyof typeof DebtCaseIdentityDocumentType];

function digitsOnly(value: string): string {
  return value.replace(/\D/g, "");
}

/** Luhn-style checksum for Israeli teudat zehut (9 digits). */
export function isValidIsraeliIdChecksum(nineDigits: string): boolean {
  if (!/^\d{9}$/.test(nineDigits)) {
    return false;
  }
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    let digit = Number(nineDigits[i]);
    const weight = (i % 2) + 1;
    digit *= weight;
    if (digit > 9) {
      digit -= 9;
    }
    sum += digit;
  }
  return sum % 10 === 0;
}

export function validateIsraeliIdNumber(raw: string): {
  ok: boolean;
  normalized: string | null;
} {
  const normalized = digitsOnly(raw);
  if (!isValidIsraeliIdChecksum(normalized)) {
    return { ok: false, normalized: null };
  }
  return { ok: true, normalized };
}

/** Company registration (ח.פ.) — format only, 8–9 digits. */
export function validateCompanyHpNumber(raw: string): {
  ok: boolean;
  normalized: string | null;
} {
  const normalized = digitsOnly(raw);
  if (normalized.length < 8 || normalized.length > 9) {
    return { ok: false, normalized: null };
  }
  return { ok: true, normalized };
}

export function validateIdentityDocument(input: {
  documentType: DebtCaseIdentityDocumentType;
  documentNumber: string;
}): { ok: boolean; normalized: string | null } {
  switch (input.documentType) {
    case DebtCaseIdentityDocumentType.ISRAELI_ID:
      return validateIsraeliIdNumber(input.documentNumber);
    case DebtCaseIdentityDocumentType.COMPANY_HP:
      return validateCompanyHpNumber(input.documentNumber);
    default:
      return { ok: false, normalized: null };
  }
}

/** Optional identity at submission — type and number must appear together. */
export function validateOptionalIdentityDocument(input: {
  documentType: DebtCaseIdentityDocumentType | null | undefined;
  documentNumber: string | null | undefined;
}): { ok: boolean; normalized: string | null; documentType: DebtCaseIdentityDocumentType | null } {
  const type = input.documentType ?? null;
  const number = input.documentNumber?.trim() ?? "";
  if (!type && !number) {
    return { ok: true, normalized: null, documentType: null };
  }
  if (!type || !number) {
    return { ok: false, normalized: null, documentType: null };
  }
  const validated = validateIdentityDocument({ documentType: type, documentNumber: number });
  return {
    ok: validated.ok,
    normalized: validated.normalized,
    documentType: validated.ok ? type : null,
  };
}
