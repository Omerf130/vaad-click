import Link from "next/link";

import { ButtonLink } from "@/components/ui/Button/ButtonLink";
import { AdminEmptyState } from "@/modules/admin/components/AdminEmptyState";
import { AdminPageFrame } from "@/modules/admin/components/AdminPageFrame";
import {
  countPendingApprovalUsers,
  listAdminUsers,
} from "@/modules/users/services/admin-user-query.service";
import { AdminUsersFilters } from "@/modules/users/ui/AdminUsersFilters";
import { AdminUsersTable } from "@/modules/users/ui/AdminUsersTable";
import { AdminUsersViewTabs } from "@/modules/users/ui/AdminUsersViewTabs";
import { buildAdminUsersListHref } from "@/modules/users/ui/admin-users-list-url";
import { parseAdminUserListSearchParams } from "@/modules/users/validation/admin-user-list.schema";
import { requireLawyerAdminPortal } from "@/shared/auth/require-access";

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function AdminUsersPage({ searchParams }: PageProps) {
  const context = await requireLawyerAdminPortal();
  const raw = await searchParams;

  const params = parseAdminUserListSearchParams(raw);

  const [listResult, pendingCount] = await Promise.all([
    listAdminUsers({ context, params }),
    countPendingApprovalUsers(context),
  ]);

  const baseParams = {
    q: params.q,
    role: params.role,
    status: params.status,
  };

  return (
    <AdminPageFrame
      title="משתמשים"
      subtitle="ניהול חשבונות שנרשמו בהרשמה הציבורית (נציג בניין וחברת ניהול). אישור מאפשר התחברות בלבד — שיוך לבניין מתבצע בנפרד."
      breadcrumbs={[
        { label: "סקירה", href: "/app/admin" },
        { label: "משתמשים" },
      ]}
    >
      <AdminUsersViewTabs
        activeView={params.view}
        pendingCount={pendingCount}
        baseParams={baseParams}
      />

      {params.view === "pending" ? (
        <p role="status">
          {pendingCount > 0
            ? `${pendingCount} בקשות ממתינות לאישור מנהל המשרד.`
            : "אין כרגע בקשות ממתינות."}
        </p>
      ) : null}

      <AdminUsersFilters params={params} />

      {listResult.items.length === 0 ? (
        <AdminEmptyState
          title={params.view === "pending" ? "אין בקשות ממתינות" : "לא נמצאו משתמשים"}
          description={
            params.q || params.role || params.status
              ? "נסו לשנות את מסנני החיפוש."
              : "משתמשים חדשים יופיעו כאן לאחר הרשמה."
          }
          actions={
            params.view === "pending" ? (
              <ButtonLink href={buildAdminUsersListHref({ view: "all" })} variant="secondary" size="sm">
                הצגת כל המשתמשים
              </ButtonLink>
            ) : null
          }
        />
      ) : (
        <AdminUsersTable
          items={listResult.items}
          listParams={params}
          page={listResult.page}
          totalPages={listResult.totalPages}
          total={listResult.total}
        />
      )}

      <p>
        <Link href="/app/admin">חזרה לסקירה הכללית</Link>
      </p>
    </AdminPageFrame>
  );
}
