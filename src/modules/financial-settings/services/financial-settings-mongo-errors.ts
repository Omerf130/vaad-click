import "server-only";

import { MongoServerError } from "mongodb";

import {
  FinancialSettingsError,
  FinancialSettingsErrorCode,
} from "@/modules/financial-settings/domain/financial-settings-errors";

export function rethrowFinancialSettingsMongoError(error: unknown): never {
  if (error instanceof MongoServerError && error.code === 11000) {
    const keyPattern = error.keyPattern ?? {};
    if ("status" in keyPattern) {
      throw new FinancialSettingsError(
        FinancialSettingsErrorCode.DRAFT_ALREADY_EXISTS,
        "A financial settings draft already exists",
      );
    }
    if ("effectiveFrom" in keyPattern) {
      throw new FinancialSettingsError(
        FinancialSettingsErrorCode.EFFECTIVE_DATE_CONFLICT,
        "A published financial settings version already starts on this effective date",
      );
    }
    if ("versionNumber" in keyPattern) {
      throw new FinancialSettingsError(
        FinancialSettingsErrorCode.EFFECTIVE_DATE_CONFLICT,
        "Published financial settings version number conflict",
      );
    }
  }

  throw error;
}
