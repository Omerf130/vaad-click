import { z } from "zod";

import { LawyerVerificationStatus } from "@/modules/buildings/domain/building-status";

export const buildingAddressSchema = z.object({
  city: z.string().trim().min(1, "יש להזין עיר").max(120),
  street: z.string().trim().min(1, "יש להזין רחוב").max(200),
  houseNumber: z.string().trim().min(1, "יש להזין מספר בית").max(32),
  postalCode: z.string().trim().max(16).optional(),
});

export const createBuildingInputSchema = z.object({
  displayName: z.string().trim().min(1).max(200),
  address: buildingAddressSchema,
  unitCount: z.coerce.number().int().min(0).optional(),
  averageMonthlyVaadFeeMinor: z.coerce.number().int().min(0).optional(),
  duplicateAddressExceptionReason: z.string().trim().min(3).max(500).optional(),
});

export type CreateBuildingInput = z.infer<typeof createBuildingInputSchema>;

/** Management company portal — name and address only; no duplicate-exception bypass. */
export const managementCompanyCreateBuildingInputSchema = z.object({
  displayName: z.string().trim().min(1, "יש להזין שם בניין").max(200),
  address: buildingAddressSchema,
});

export type ManagementCompanyCreateBuildingInput = z.infer<
  typeof managementCompanyCreateBuildingInputSchema
>;

export const updateBuildingInputSchema = z.object({
  buildingId: z.string().trim().uuid(),
  displayName: z.string().trim().min(1).max(200),
  address: buildingAddressSchema,
  unitCount: z.coerce.number().int().min(0).optional().nullable(),
  averageMonthlyVaadFeeMinor: z.coerce.number().int().min(0).optional().nullable(),
  duplicateAddressExceptionReason: z.string().trim().min(3).max(500).optional(),
});

export type UpdateBuildingInput = z.infer<typeof updateBuildingInputSchema>;

export const updateBuildingOrganizationalStatusSchema = z.object({
  buildingId: z.string().trim().uuid(),
  organizationalStatus: z.enum(["active", "archived"]),
});

export const assignRepresentativeInputSchema = z.object({
  buildingId: z.string().trim().min(1),
  representativeUserId: z.string().trim().min(1),
  previousRepresentativeUserId: z.string().trim().min(1).optional(),
});

export const linkManagementCompanyToBuildingSchema = z.object({
  buildingId: z.string().trim().uuid(),
  managementCompanyId: z.string().trim().uuid(),
});

export const updateBuildingVerificationStatusSchema = z.object({
  buildingId: z.string().trim().min(1),
  lawyerVerificationStatus: z.enum([
    LawyerVerificationStatus.NOT_STARTED,
    LawyerVerificationStatus.PENDING_DOCUMENTS,
    LawyerVerificationStatus.PENDING_LAWYER_REVIEW,
  ]),
});
