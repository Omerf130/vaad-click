import {
  FinancialSettingsError,
  FinancialSettingsErrorCode,
} from "@/modules/financial-settings/domain/financial-settings-errors";
import type { VatScheduleEntry } from "@/modules/financial-settings/domain/published-financial-settings-version";

export function resolveVatScheduleEntryForInstant(
  schedule: VatScheduleEntry[],
  asOf: Date,
): VatScheduleEntry {
  const sorted = [...schedule].sort(
    (left, right) => left.effectiveFrom.getTime() - right.effectiveFrom.getTime(),
  );

  let selected: VatScheduleEntry | null = null;
  for (const entry of sorted) {
    if (entry.effectiveFrom.getTime() <= asOf.getTime()) {
      selected = entry;
    } else {
      break;
    }
  }

  if (!selected) {
    throw new FinancialSettingsError(
      FinancialSettingsErrorCode.VALIDATION,
      "No VAT schedule entry applies at the requested instant",
    );
  }

  return selected;
}
