import { z } from "zod";

import { AccountStatus } from "@/modules/users/domain/account-status";
import { UserRole } from "@/modules/users/domain/user-role";
import { emailInputSchema } from "@/shared/validation/email";

const phoneE164Schema = z
  .string()
  .regex(/^\+[1-9]\d{7,14}$/, "מספר טלפון חייב להיות בפורמט E.164");

/** Validates identity fields for admin-provisioned users (CP6). Not exposed as a public API in CP3A. */
export const userIdentitySchema = z
  .object({
    role: z.enum([
      UserRole.LAWYER_ADMIN,
      UserRole.BUILDING_REP,
      UserRole.MANAGEMENT_COMPANY,
    ]),
    email: emailInputSchema.optional(),
    phoneE164: phoneE164Schema.optional(),
    accountStatus: z
      .enum([
        AccountStatus.PENDING_APPROVAL,
        AccountStatus.ACTIVE,
        AccountStatus.REJECTED,
        AccountStatus.DISABLED,
        AccountStatus.LOCKED,
      ])
      .default(AccountStatus.PENDING_APPROVAL),
  })
  .superRefine((data, ctx) => {
    if (!data.email) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "נדרש דוא\"ל",
        path: ["email"],
      });
    }
  });

export type UserIdentityInput = z.infer<typeof userIdentitySchema>;
