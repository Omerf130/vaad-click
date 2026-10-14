import { BuildingOrganizationalStatus } from "@/modules/buildings/domain/building-status";

export function formatBuildingOrganizationalStatusHe(status: string): string {
  if (status === BuildingOrganizationalStatus.ACTIVE) {
    return "פעיל";
  }
  if (status === BuildingOrganizationalStatus.ARCHIVED) {
    return "בארכיון";
  }
  return status;
}
