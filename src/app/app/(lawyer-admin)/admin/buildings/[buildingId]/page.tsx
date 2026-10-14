import Link from "next/link";
import { notFound } from "next/navigation";

import { AdminPageFrame } from "@/modules/admin/components/AdminPageFrame";
import {
  getAdminBuildingDetail,
  listActiveManagementCompaniesForLinking,
  listEligibleBuildingRepresentatives,
} from "@/modules/buildings/services/admin-building-query.service";
import { BuildingDetailPanels } from "@/modules/buildings/ui/BuildingDetailPanels";
import { requireLawyerAdminPortal } from "@/shared/auth/require-access";

type PageProps = {
  params: Promise<{ buildingId: string }>;
};

export default async function AdminBuildingDetailPage({ params }: PageProps) {
  const context = await requireLawyerAdminPortal();
  const { buildingId } = await params;

  const [building, eligibleRepresentatives, managementCompanies] = await Promise.all([
    getAdminBuildingDetail({ context, buildingId }),
    listEligibleBuildingRepresentatives({ buildingId }),
    listActiveManagementCompaniesForLinking(),
  ]);

  if (!building) {
    notFound();
  }

  const repOptions = [...eligibleRepresentatives];
  if (
    building.representative &&
    !repOptions.some((rep) => rep.id === building.representative!.id)
  ) {
    repOptions.unshift({
      id: building.representative.id,
      fullName: building.representative.fullName,
      email: building.representative.email,
    });
  }

  return (
    <AdminPageFrame
      title={building.displayName}
      subtitle={building.buildingId}
      toolbar={<Link href="/app/admin/buildings">חזרה לרשימה</Link>}
    >
      <BuildingDetailPanels
        building={building}
        eligibleRepresentatives={repOptions}
        managementCompanies={managementCompanies}
      />
    </AdminPageFrame>
  );
}
