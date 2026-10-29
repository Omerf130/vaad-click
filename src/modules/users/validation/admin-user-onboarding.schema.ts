import { z } from "zod";

import { PendingBuildingOnboardingStatus } from "@/modules/debt-cases/domain/pending-building-onboarding-status";

export const bindUserPendingOnboardingBuildingSchema = z.object({
  targetUserId: z.string().regex(/^[a-f0-9]{24}$/i),
  onboardingRequestId: z.string().trim().uuid(),
  buildingId: z.string().trim().uuid(),
  expectedOnboardingStatus: z.enum([
    PendingBuildingOnboardingStatus.OPEN,
    PendingBuildingOnboardingStatus.BOUND,
  ]),
  expectedBoundBuildingId: z
    .union([z.string().trim().uuid(), z.literal("")])
    .transform((value) => (value === "" ? null : value))
    .optional()
    .nullable(),
});

export type BindUserPendingOnboardingBuildingInput = z.infer<
  typeof bindUserPendingOnboardingBuildingSchema
>;

export const adminUserOnboardingBuildingSearchSchema = z.object({
  q: z.string().trim().max(120).optional(),
  page: z.coerce.number().int().min(1).default(1),
});

export type AdminUserOnboardingBuildingSearchParams = z.infer<
  typeof adminUserOnboardingBuildingSearchSchema
>;
