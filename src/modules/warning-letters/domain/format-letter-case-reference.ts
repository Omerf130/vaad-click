/** Human-readable warning-letter case reference: WH-YYYY-NNNNNN (zero-padded sequence per calendar year). */
export function formatLetterCaseReference(year: number, sequenceNumber: number): string {
  if (!Number.isInteger(year) || year < 2000 || year > 2100) {
    throw new Error("Invalid letter case reference year");
  }
  if (!Number.isInteger(sequenceNumber) || sequenceNumber < 1 || sequenceNumber > 999_999) {
    throw new Error("Invalid letter case reference sequence");
  }
  return `WH-${year}-${String(sequenceNumber).padStart(6, "0")}`;
}
