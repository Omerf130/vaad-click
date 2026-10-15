export const DebtCaseOccupancyType = {
  OWNER: "owner",
  TENANT: "tenant",
} as const;

export type DebtCaseOccupancyType =
  (typeof DebtCaseOccupancyType)[keyof typeof DebtCaseOccupancyType];

export const DEBT_CASE_OCCUPANCY_TYPES: readonly DebtCaseOccupancyType[] =
  Object.values(DebtCaseOccupancyType);
