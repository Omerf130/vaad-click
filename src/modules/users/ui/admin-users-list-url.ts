import type { AdminUserListParams } from "@/modules/users/validation/admin-user-list.schema";

export function buildAdminUsersListHref(
  params: Partial<AdminUserListParams> & { view?: AdminUserListParams["view"] },
): string {
  const search = new URLSearchParams();
  if (params.view && params.view !== "all") {
    search.set("view", params.view);
  }
  if (params.q) {
    search.set("q", params.q);
  }
  if (params.role) {
    search.set("role", params.role);
  }
  if (params.status) {
    search.set("status", params.status);
  }
  if (params.page && params.page > 1) {
    search.set("page", String(params.page));
  }
  const query = search.toString();
  return query ? `/app/admin/users?${query}` : "/app/admin/users";
}
