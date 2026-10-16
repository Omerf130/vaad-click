/** Integer agorot → Hebrew letter display (e.g. 122400 → "1,224 ₪"). */
export function formatMinorUnitsForLetterDisplay(amountMinor: number): string {
  if (!Number.isInteger(amountMinor) || amountMinor < 0) {
    throw new RangeError("amountMinor must be a non-negative integer");
  }
  const shekels = Math.floor(amountMinor / 100);
  const agorot = amountMinor % 100;
  const wholeFormatted = shekels.toLocaleString("he-IL");
  if (agorot === 0) {
    return `${wholeFormatted} ₪`;
  }
  const agorotStr = agorot < 10 ? `0${agorot}` : String(agorot);
  return `${wholeFormatted}.${agorotStr} ₪`;
}
