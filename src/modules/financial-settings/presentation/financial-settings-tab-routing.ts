export const FINANCIAL_SETTINGS_TAB_IDS = [
  "fees",
  "vat",
  "publish",
  "history",
] as const;

export type FinancialSettingsTabId = (typeof FINANCIAL_SETTINGS_TAB_IDS)[number];

export const FINANCIAL_SETTINGS_TAB_LABELS: Record<FinancialSettingsTabId, string> = {
  fees: "תעריפים",
  vat: 'מע"מ',
  publish: "פרסום",
  history: "היסטוריה",
};

const FEES_FIELDS = new Set([
  "debtorTreatmentFeeShekels",
  "committeeWaiverFeeShekels",
  "escalationPercent",
  "notesInternal",
]);

export function resolveFinancialSettingsTabForFieldErrors(
  fieldErrors: Record<string, string[]>,
): FinancialSettingsTabId {
  const keys = Object.keys(fieldErrors);
  if (keys.some((key) => key.startsWith("vat_"))) {
    return "vat";
  }
  if (keys.some((key) => FEES_FIELDS.has(key))) {
    return "fees";
  }
  return "fees";
}

export function tabHasValidationErrors(
  tabId: FinancialSettingsTabId,
  fieldErrors: Record<string, string[]> | undefined,
): boolean {
  if (!fieldErrors || Object.keys(fieldErrors).length === 0) {
    return false;
  }
  return resolveFinancialSettingsTabForFieldErrors(fieldErrors) === tabId;
}
