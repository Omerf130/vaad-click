/**
 * Derives net and VAT components from a VAT-inclusive gross amount (integer agorot).
 * Uses half-up rounding for net; vat = gross - net (no double VAT).
 */
export type VatAmountBreakdown = {
  grossMinor: number;
  netMinor: number;
  vatMinor: number;
  vatRateBasisPoints: number;
};

export function deriveNetAndVatFromGrossMinor(input: {
  grossMinor: number;
  vatRateBasisPoints: number;
}): VatAmountBreakdown {
  const { grossMinor, vatRateBasisPoints } = input;

  if (!Number.isInteger(grossMinor) || grossMinor < 0) {
    throw new Error("grossMinor must be a non-negative integer");
  }
  if (!Number.isInteger(vatRateBasisPoints) || vatRateBasisPoints < 0) {
    throw new Error("vatRateBasisPoints must be a non-negative integer");
  }

  if (vatRateBasisPoints === 0) {
    return {
      grossMinor,
      netMinor: grossMinor,
      vatMinor: 0,
      vatRateBasisPoints,
    };
  }

  const divisor = 10_000 + vatRateBasisPoints;
  const netMinor = Math.floor((grossMinor * 10_000 + divisor / 2) / divisor);
  const vatMinor = grossMinor - netMinor;

  return {
    grossMinor,
    netMinor,
    vatMinor,
    vatRateBasisPoints,
  };
}
