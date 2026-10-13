import { z } from "zod";

import { passwordInputSchema } from "@/shared/security/password.schema";
import { emailInputSchema } from "@/shared/validation/email";

export const loginInputSchema = z.object({
  email: emailInputSchema,
  password: passwordInputSchema,
});

export type LoginInput = z.infer<typeof loginInputSchema>;
