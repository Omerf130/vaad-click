/** Normalize common Israeli mobile input to E.164 (+972...). Returns null if not parseable. */
export function normalizeMobileToE164(raw: string): string | null {
  const digits = raw.replace(/\D/g, "");
  if (!digits) {
    return null;
  }

  if (raw.trim().startsWith("+") && /^\+[1-9]\d{7,14}$/.test(raw.trim())) {
    return raw.trim();
  }

  if (digits.startsWith("972") && digits.length >= 11 && digits.length <= 13) {
    return `+${digits}`;
  }

  if (digits.startsWith("0") && digits.length === 10) {
    return `+972${digits.slice(1)}`;
  }

  if (digits.length === 9 && digits.startsWith("5")) {
    return `+972${digits}`;
  }

  return null;
}

export function isValidE164Mobile(value: string): boolean {
  return /^\+[1-9]\d{7,14}$/.test(value);
}

export function mobileNumbersEqual(a: string, b: string): boolean {
  const na = normalizeMobileToE164(a);
  const nb = normalizeMobileToE164(b);
  if (!na || !nb) {
    return false;
  }
  return na === nb;
}
