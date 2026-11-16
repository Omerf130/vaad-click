const HEBREW_ORDINALS = [
  "א",
  "ב",
  "ג",
  "ד",
  "ה",
  "ו",
  "ז",
  "ח",
  "ט",
  "י",
  "י״א",
  "י״ב",
  "י״ג",
  "י״ד",
  "י״ט",
  "כ",
  "כ״א",
  "כ״ב",
] as const;

export function formatHebrewExhibitLabel(zeroBasedIndex: number): string {
  if (zeroBasedIndex >= 0 && zeroBasedIndex < HEBREW_ORDINALS.length) {
    return `נספח ${HEBREW_ORDINALS[zeroBasedIndex]}׳`;
  }
  return `נספח ${zeroBasedIndex + 1}`;
}