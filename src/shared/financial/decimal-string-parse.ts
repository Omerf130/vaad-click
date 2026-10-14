import { MAX_MONEY_MINOR_UNITS } from "@/shared/financial/money.schema";
import { MAX_BASIS_POINTS } from "@/shared/financial/percentage.schema";

export type DecimalParseSuccess = {
  ok: true;
  scaledInteger: number;
};

export type DecimalParseFailure = {
  ok: false;
  messageHe: string;
};

export type DecimalParseResult = DecimalParseSuccess | DecimalParseFailure;

const DECIMAL_INPUT_PATTERN = /^(\d+)(?:\.(\d+))?$/;

/**
 * Parses a non-negative decimal string into an integer at fixed scale (e.g. scale 2 → agorot / basis points).
 * Does not use floating-point multiplication.
 */
export function parseDecimalStringToScaledInteger(
  raw: string,
  options: {
    scale: number;
    maxScaledInteger: number;
    emptyMessageHe: string;
    invalidMessageHe: string;
    tooManyDecimalsMessageHe: string;
    tooLargeMessageHe: string;
  },
): DecimalParseResult {
  const trimmed = raw.trim();
  if (!trimmed) {
    return { ok: false, messageHe: options.emptyMessageHe };
  }

  const match = trimmed.match(DECIMAL_INPUT_PATTERN);
  if (!match) {
    return { ok: false, messageHe: options.invalidMessageHe };
  }

  const wholePart = match[1] ?? "0";
  const fractionalPart = match[2] ?? "";

  if (fractionalPart.length > options.scale) {
    return { ok: false, messageHe: options.tooManyDecimalsMessageHe };
  }

  const paddedFraction = fractionalPart.padEnd(options.scale, "0");
  const scaleFactor = 10 ** options.scale;

  let scaled: bigint;
  try {
    scaled =
      BigInt(wholePart) * BigInt(scaleFactor) +
      BigInt(paddedFraction === "" ? "0" : paddedFraction);
  } catch {
    return { ok: false, messageHe: options.invalidMessageHe };
  }

  if (scaled > BigInt(options.maxScaledInteger)) {
    return { ok: false, messageHe: options.tooLargeMessageHe };
  }

  const scaledNumber = Number(scaled);
  if (!Number.isSafeInteger(scaledNumber)) {
    return { ok: false, messageHe: options.tooLargeMessageHe };
  }

  return { ok: true, scaledInteger: scaledNumber };
}

export function parseShekelsStringToMinorUnits(raw: string): DecimalParseResult {
  return parseDecimalStringToScaledInteger(raw, {
    scale: 2,
    maxScaledInteger: MAX_MONEY_MINOR_UNITS,
    emptyMessageHe: "יש להזין סכום בשקלים",
    invalidMessageHe: "סכום לא תקין",
    tooManyDecimalsMessageHe: "ניתן להזין עד שתי ספרות אחרי הנקודה",
    tooLargeMessageHe: "הסכום גדול מדי",
  });
}

export function parsePercentStringToBasisPoints(raw: string): DecimalParseResult {
  return parseDecimalStringToScaledInteger(raw, {
    scale: 2,
    maxScaledInteger: MAX_BASIS_POINTS,
    emptyMessageHe: "יש להזין אחוז",
    invalidMessageHe: "אחוז לא תקין",
    tooManyDecimalsMessageHe: "ניתן להזין עד שתי ספרות אחרי הנקודה",
    tooLargeMessageHe: "האחוז גדול מדי",
  });
}

export function formatMinorUnitsAsShekels(amountMinor: number): string {
  const whole = Math.trunc(amountMinor / 100);
  const fraction = Math.abs(amountMinor % 100);
  return `${whole}.${fraction.toString().padStart(2, "0")}`;
}

export function formatBasisPointsAsPercentDisplay(basisPoints: number): string {
  const whole = Math.trunc(basisPoints / 100);
  const fraction = Math.abs(basisPoints % 100);
  if (fraction === 0) {
    return String(whole);
  }
  return `${whole}.${fraction.toString().padStart(2, "0")}`;
}
