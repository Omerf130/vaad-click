import type { AdminBuildingListParams } from "@/modules/buildings/validation/admin-building-list.schema";

export function buildAdminBuildingsListHref(
  params: Partial<AdminBuildingListParams>,
): string {
  const search = new URLSearchParams();
  if (params.q) {
    search.set("q", params.q);
  }
  if (params.status) {
    search.set("status", params.status);
  }
  if (params.verification) {
    search.set("verification", params.verification);
  }
  if (params.page && params.page > 1) {
    search.set("page", String(params.page));
  }
  const query = search.toString();
  return query ? `/app/admin/buildings?${query}` : "/app/admin/buildings";
}
