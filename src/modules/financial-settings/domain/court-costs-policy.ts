export const CourtCostsPolicy = {
  UNSPECIFIED: "unspecified",
} as const;

export type CourtCostsPolicy =
  (typeof CourtCostsPolicy)[keyof typeof CourtCostsPolicy];

export const COURT_COSTS_POLICIES: readonly CourtCostsPolicy[] =
  Object.values(CourtCostsPolicy);
