import { z } from "zod";

/** Normalizes email for storage and lookup (Unicode trim + lowercase). */
export function normalizeEmail(raw: string): string {
  return raw.normalize("NFKC").trim().toLowerCase();
}

export const emailInputSchema = z
  .string()
  .min(1, "נדרש דוא\"ל")
  .max(320)
  .transform(normalizeEmail)
  .pipe(z.email("כתובת דוא\"ל לא תקינה"));
