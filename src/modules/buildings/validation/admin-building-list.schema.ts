import { z } from "zod";

import { BuildingOrganizationalStatus } from "@/modules/buildings/domain/building-status";
import { normalizeAdminUserListQueryValue } from "@/modules/users/validation/admin-user-list.schema";

export const ADMIN_BUILDING_LIST_PAGE_SIZE = 20;

export const adminBuildingListParamsSchema = z.object({
  q: z.string().trim().max(120).optional(),
  status: z
    .enum([BuildingOrganizationalStatus.ACTIVE, BuildingOrganizationalStatus.ARCHIVED])
    .optional(),
  page: z.coerce.number().int().min(1).default(1),
});

export type AdminBuildingListParams = z.infer<typeof adminBuildingListParamsSchema>;

export function parseAdminBuildingListSearchParams(
  raw: Record<string, string | string[] | undefined>,
): AdminBuildingListParams {
  const single = (key: string): string | undefined => {
    const value = raw[key];
    if (Array.isArray(value)) {
      return normalizeAdminUserListQueryValue(value[0]);
    }
    return normalizeAdminUserListQueryValue(value);
  };

  return adminBuildingListParamsSchema.parse({
    q: single("q"),
    status: single("status"),
    page: single("page"),
  });
}
