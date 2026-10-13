import { z } from "zod";

import { UserRole } from "@/modules/users/domain/user-role";
import { passwordInputSchema } from "@/shared/security/password.schema";
import { emailInputSchema } from "@/shared/validation/email";

export const PUBLIC_REGISTRATION_ROLES = [
  UserRole.BUILDING_REP,
  UserRole.MANAGEMENT_COMPANY,
] as const;

export type PublicRegistrationRole = (typeof PUBLIC_REGISTRATION_ROLES)[number];

export const registerInputSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(2, "יש להזין שם מלא")
    .max(200, "שם מלא ארוך מדי"),
  email: emailInputSchema,
  password: passwordInputSchema,
  role: z.enum(PUBLIC_REGISTRATION_ROLES, {
    message: "יש לבחור סוג חשבון",
  }),
});

export type RegisterInput = z.infer<typeof registerInputSchema>;
