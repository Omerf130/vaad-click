import { z } from "zod";

import { AccountStatus } from "@/modules/users/domain/account-status";
import { UserRole } from "@/modules/users/domain/user-role";

export const ADMIN_USER_LIST_PAGE_SIZE = 20;

export const adminUserListViewSchema = z.enum(["all", "pending"]);

export const adminUserListParamsSchema = z.object({
  q: z.string().trim().max(120).optional(),
  role: z.enum([UserRole.BUILDING_REP, UserRole.MANAGEMENT_COMPANY]).optional(),
  status: z
    .enum([
      AccountStatus.PENDING_APPROVAL,
      AccountStatus.ACTIVE,
      AccountStatus.REJECTED,
      AccountStatus.DISABLED,
      AccountStatus.LOCKED,
    ])
    .optional(),
  view: adminUserListViewSchema.default("all"),
  page: z.coerce.number().int().min(1).default(1),
});

export type AdminUserListParams = z.infer<typeof adminUserListParamsSchema>;

/** HTML forms submit empty selects as "" — treat as absent for Zod optional enums. */
export function normalizeAdminUserListQueryValue(
  value: string | undefined,
): string | undefined {
  if (value === undefined) {
    return undefined;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

export function parseAdminUserListSearchParams(
  raw: Record<string, string | string[] | undefined>,
): AdminUserListParams {
  const single = (key: string): string | undefined => {
    const value = raw[key];
    if (Array.isArray(value)) {
      return normalizeAdminUserListQueryValue(value[0]);
    }
    return normalizeAdminUserListQueryValue(value);
  };

  return adminUserListParamsSchema.parse({
    q: single("q"),
    role: single("role"),
    status: single("status"),
    view: single("view") ?? "all",
    page: single("page"),
  });
}
