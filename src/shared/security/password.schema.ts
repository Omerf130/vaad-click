import { z } from "zod";

export const PASSWORD_MIN_LENGTH = 12;
export const PASSWORD_MAX_LENGTH = 128;

export const passwordInputSchema = z
  .string()
  .min(PASSWORD_MIN_LENGTH, `סיסמה חייבת להכיל לפחות ${PASSWORD_MIN_LENGTH} תווים`)
  .max(PASSWORD_MAX_LENGTH, "סיסמה ארוכה מדי");

export type PasswordInput = z.infer<typeof passwordInputSchema>;
