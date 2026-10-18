import { AdminEmptyState } from "@/modules/admin/components/AdminEmptyState";
import { AdminPageFrame } from "@/modules/admin/components/AdminPageFrame";
import {
  listLawyerDebtCaseBuildingFilterOptions,
  listLawyerDebtCasesForReview,
} from "@/modules/debt-cases/services/lawyer-debt-case-query.service";
import { LawyerDebtCaseQueueFilters } from "@/modules/debt-cases/ui/lawyer/LawyerDebtCaseQueueFilters";
import { LawyerDebtCaseQueueTable } from "@/modules/debt-cases/ui/lawyer/LawyerDebtCaseQueueTable";
import { buildLawyerDebtCaseListHref } from "@/modules/debt-cases/ui/lawyer/lawyer-debt-case-list-url";
import { isLawyerDebtCaseListDefaultParams } from "@/modules/debt-cases/presentation/lawyer-debt-case-list-filters";
import { parseLawyerDebtCaseListSearchParams } from "@/modules/debt-cases/validation/lawyer-debt-case-list.schema";
import { requireLawyerAdminPortal } from "@/shared/auth/require-access";

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function AdminDebtCasesReviewQueuePage({ searchParams }: PageProps) {
  const context = await requireLawyerAdminPortal();
  const params = parseLawyerDebtCaseListSearchParams(await searchParams);

  const [listResult, buildings] = await Promise.all([
    listLawyerDebtCasesForReview({ context, params }),
    listLawyerDebtCaseBuildingFilterOptions({ context }),
  ]);

  return (
    <AdminPageFrame
      title="תיקי חוב — בדיקת עורך דין"
      subtitle="תור בדיקה לכל הבניינים. ברירת המחדל מציגה תיקים שהוגשו וממתינים לבדיקה, לפי תאריך הגשה."
      breadcrumbs={[
        { label: "סקירה", href: "/app/admin" },
        { label: "תיקי חוב" },
      ]}
    >
      <LawyerDebtCaseQueueFilters params={params} buildings={buildings} />

      {listResult.items.length === 0 ? (
        <AdminEmptyState
          title="לא נמצאו תיקים"
          description={
            !isLawyerDebtCaseListDefaultParams(params)
              ? "נסו לשנות את מסנני החיפוש."
              : "תיקים יופיעו כאן לאחר שהנציגים יגישו אותם לבדיקה."
          }
        />
      ) : (
        <LawyerDebtCaseQueueTable list={listResult} params={params} />
      )}

      {listResult.totalCount > 0 && listResult.page > listResult.totalPages ? (
        <p role="status">
          <a href={buildLawyerDebtCaseListHref({ ...params, page: listResult.totalPages })}>
            חזרה לעמוד האחרון
          </a>
        </p>
      ) : null}
    </AdminPageFrame>
  );
}
