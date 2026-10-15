const HEBREW_GERESH = /[\u05F3\u05F4']/g;
const WHITESPACE = /\s+/g;

export type NormalizedApartmentIdentifier = {
  /** User-entered value preserved for display and letters. */
  apartmentNumberDisplay: string;
  /** Stable key for duplicate detection within a building. */
  apartmentKeyNormalized: string;
};

/**
 * Normalizes apartment identifiers for duplicate detection while preserving display text.
 * Rules: trim, collapse whitespace, unify geresh variants, lowercase Latin letters.
 */
export function normalizeApartmentIdentifier(raw: string): NormalizedApartmentIdentifier {
  const apartmentNumberDisplay = raw.trim().replace(WHITESPACE, " ");
  if (!apartmentNumberDisplay) {
    return { apartmentNumberDisplay: "", apartmentKeyNormalized: "" };
  }

  let key = apartmentNumberDisplay
    .replace(HEBREW_GERESH, "")
    .replace(WHITESPACE, "")
    .toLowerCase();

  key = key.normalize("NFKC");

  return {
    apartmentNumberDisplay,
    apartmentKeyNormalized: key,
  };
}
