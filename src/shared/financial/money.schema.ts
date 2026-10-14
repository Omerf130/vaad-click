import { z } from "zod";

import { CurrencyCode, CURRENCY_CODES } from "@/shared/financial/currency";

/** Largest safe agorot amount (~90 trillion ILS) — technical bound only. */
export const MAX_MONEY_MINOR_UNITS = 9_007_199_254_740_991;

export const moneyAmountSchema = z.object({
  currency: z.enum(CURRENCY_CODES as [CurrencyCode, ...CurrencyCode[]]),
  amountMinor: z
    .number()
    .int("סכום חייב להיות שלם באגורות")
    .nonnegative("סכום לא יכול להיות שלילי")
    .max(MAX_MONEY_MINOR_UNITS),
});

export type MoneyAmount = z.infer<typeof moneyAmountSchema>;
