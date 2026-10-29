import Link from "next/link";
import { notFound } from "next/navigation";

import { AdminPageFrame } from "@/modules/admin/components/AdminPageFrame";
import { getAdminUserDetail } from "@/modules/users/services/admin-user-query.service";
import {
  listBuildingsForUserOnboardingAssignment,
  loadAdminUserOnboardingRequest,
} from "@/modules/users/services/admin-user-onboarding.service";
import { adminUserOnboardingBuildingSearchSchema } from "@/modules/users/validation/admin-user-onboarding.schema";
import { AdminUserDetailSections } from "@/modules/users/ui/AdminUserDetailSections";
import { requireLawyerAdminPortal } from "@/shared/auth/require-access";

type PageProps = {
  params: Promise<{ userId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function readSingle(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) {
    return value[0];
  }
  return value;
}

export default async function AdminUserDetailPage({ params, searchParams }: PageProps) {
  const context = await requireLawyerAdminPortal();
  const { userId } = await params;
  const rawSearch = await searchParams;

  const user = await getAdminUserDetail({ context, userId });

  if (!user) {
    notFound();
  }

  const buildingSearch = adminUserOnboardingBuildingSearchSchema.parse({
    q: readSingle(rawSearch.buildingQ),
    page: readSingle(rawSearch.buildingPage),
  });

  const [onboarding, buildingOptions] = await Promise.all([
    loadAdminUserOnboardingRequest(userId),
    listBuildingsForUserOnboardingAssignment({
      context,
      targetUserId: userId,
      params: buildingSearch,
    }),
  ]);

  return (
    <AdminPageFrame
      title={user.fullName}
      subtitle={user.email}
      toolbar={
        <Link href="/app/admin/users">חזרה לרשימה</Link>
      }
    >
      <AdminUserDetailSections
        user={user}
        onboarding={onboarding}
        buildingOptions={buildingOptions}
        buildingSearchQ={buildingSearch.q ?? ""}
      />
    </AdminPageFrame>
  );
}
