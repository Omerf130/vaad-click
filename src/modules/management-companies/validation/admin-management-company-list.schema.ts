import { z } from "zod";

import { normalizeAdminUserListQueryValue } from "@/modules/users/validation/admin-user-list.schema";

export const ADMIN_MANAGEMENT_COMPANY_LIST_PAGE_SIZE = 20;

export const adminManagementCompanyListParamsSchema = z.object({
  q: z.string().trim().max(120).optional(),
  page: z.coerce.number().int().min(1).default(1),
});

export type AdminManagementCompanyListParams = z.infer<
  typeof adminManagementCompanyListParamsSchema
>;

export function parseAdminManagementCompanyListSearchParams(
  raw: Record<string, string | string[] | undefined>,
): AdminManagementCompanyListParams {
  const single = (key: string): string | undefined => {
    const value = raw[key];
    if (Array.isArray(value)) {
      return normalizeAdminUserListQueryValue(value[0]);
    }
    return normalizeAdminUserListQueryValue(value);
  };

  return adminManagementCompanyListParamsSchema.parse({
    q: single("q"),
    page: single("page"),
  });
}
