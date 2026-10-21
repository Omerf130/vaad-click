import { ButtonLink } from "@/components/ui/Button/ButtonLink";
import { AdminEmptyState } from "@/modules/admin/components/AdminEmptyState";
import { AdminPageFrame } from "@/modules/admin/components/AdminPageFrame";
import { listAdminBuildings } from "@/modules/buildings/services/admin-building-query.service";
import { AdminBuildingListFilters } from "@/modules/buildings/ui/AdminBuildingListFilters";
import { AdminBuildingsTable } from "@/modules/buildings/ui/AdminBuildingsTable";
import { parseAdminBuildingListSearchParams } from "@/modules/buildings/validation/admin-building-list.schema";
import { requireLawyerAdminPortal } from "@/shared/auth/require-access";

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function AdminBuildingsPage({ searchParams }: PageProps) {
  const context = await requireLawyerAdminPortal();
  const params = parseAdminBuildingListSearchParams(await searchParams);
  const list = await listAdminBuildings({ context, params });

  return (
    <AdminPageFrame
      title="בניינים"
      subtitle="יצירה, עריכה ושיוך נציגות וחברות ניהול — לפי כללי CP6."
      breadcrumbs={[
        { label: "סקירה", href: "/app/admin" },
        { label: "בניינים" },
      ]}
      toolbar={
        <ButtonLink href="/app/admin/buildings/new" variant="primary" size="sm">
          בניין חדש
        </ButtonLink>
      }
    >
      <AdminBuildingListFilters params={params} />

      {list.items.length === 0 ? (
        <AdminEmptyState
          title="לא נמצאו בניינים"
          description={params.q ? "נסו חיפוש אחר." : "צרו בניין ראשון בלחיצה על «בניין חדש»."}
        />
      ) : (
        <AdminBuildingsTable
          items={list.items}
          params={params}
          page={list.page}
          totalPages={list.totalPages}
          total={list.total}
        />
      )}
    </AdminPageFrame>
  );
}
