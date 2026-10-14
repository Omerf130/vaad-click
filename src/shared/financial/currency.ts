export const CurrencyCode = {
  ILS: "ILS",
} as const;

export type CurrencyCode = (typeof CurrencyCode)[keyof typeof CurrencyCode];

export const CURRENCY_CODES: readonly CurrencyCode[] = Object.values(CurrencyCode);
