export const BuildingAccessErrorCode = {
  DENIED: "BUILDING_ACCESS_DENIED",
  INVALID_BUILDING_ID: "INVALID_BUILDING_ID",
} as const;

export type BuildingAccessErrorCode =
  (typeof BuildingAccessErrorCode)[keyof typeof BuildingAccessErrorCode];

export class BuildingAccessError extends Error {
  readonly code: BuildingAccessErrorCode;

  constructor(code: BuildingAccessErrorCode, message: string) {
    super(message);
    this.name = "BuildingAccessError";
    this.code = code;
  }
}
