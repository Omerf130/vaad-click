import { z } from "zod";

export const createManagementCompanyFormSchema = z.object({
  displayName: z.string().trim().min(1).max(200),
  companyRegistrationNumber: z.string().trim().max(32).optional(),
  contactEmail: z.string().trim().email().optional().or(z.literal("")),
  contactPhone: z.string().trim().max(32).optional(),
  primaryUserId: z.string().regex(/^[a-f0-9]{24}$/i),
});

export const updateManagementCompanyFormSchema = z.object({
  managementCompanyId: z.string().trim().uuid(),
  displayName: z.string().trim().min(1).max(200),
  companyRegistrationNumber: z.string().trim().max(32).optional(),
  contactEmail: z.string().trim().email().optional().or(z.literal("")),
  contactPhone: z.string().trim().max(32).optional(),
});
