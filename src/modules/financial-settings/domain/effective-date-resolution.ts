export type EffectiveDated = {
  effectiveFrom: Date;
};

/**
 * Picks the published version with the greatest effectiveFrom still not after `asOf`.
 * Returns null when every published version starts after `asOf` (future-only configuration).
 */
export function selectApplicableVersionByEffectiveFrom<T extends EffectiveDated>(
  publishedVersions: readonly T[],
  asOf: Date,
): T | null {
  const asOfMs = asOf.getTime();
  let selected: T | null = null;
  let selectedMs = -1;

  for (const version of publishedVersions) {
    const effectiveMs = version.effectiveFrom.getTime();
    if (effectiveMs <= asOfMs && effectiveMs >= selectedMs) {
      selected = version;
      selectedMs = effectiveMs;
    }
  }

  return selected;
}
