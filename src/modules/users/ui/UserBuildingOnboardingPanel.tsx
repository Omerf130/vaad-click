"use client";

import Link from "next/link";
import { useActionState, useRef, useState } from "react";

import { Button } from "@/components/ui/Button/Button";
import { AdminConfirmDialog } from "@/modules/admin/components/AdminConfirmDialog";
import { AccountStatus } from "@/modules/users/domain/account-status";
import {
  bindUserPendingOnboardingBuildingAction,
  type AdminUserActionState,
} from "@/modules/users/actions/admin-user.actions";
import {
  ADMIN_USER_BUILDING_REP_SINGLE_BUILDING_HE,
  ADMIN_USER_MC_NO_COMPANY_HE,
  ADMIN_USER_ONBOARDING_PENDING_ACCOUNT_NOTE_HE,
  formatPendingOnboardingStatusHe,
} from "@/modules/users/presentation/admin-user-onboarding.he";
import { formatAdminUserRoleHe } from "@/modules/users/presentation/admin-user-labels.he";
import type { AdminUserDetail } from "@/modules/users/services/admin-user-query.service";
import type { AdminUserOnboardingBuildingOption } from "@/modules/users/services/admin-user-onboarding.service";
import type { AdminUserOnboardingRequestView } from "@/modules/users/services/admin-user-onboarding.service";
import { UserRole } from "@/modules/users/domain/user-role";
import styles from "@/modules/users/ui/AdminUsers.module.scss";

type UserBuildingOnboardingPanelProps = {
  user: AdminUserDetail;
  onboarding: AdminUserOnboardingRequestView | null;
  buildingOptions: {
    items: AdminUserOnboardingBuildingOption[];
    total: number;
    page: number;
    totalPages: number;
  };
  buildingSearchQ: string;
};

const initial: AdminUserActionState = { ok: false };

function formatBuildingLine(building: {
  displayName: string;
  city: string;
  street: string;
  houseNumber: string;
}): string {
  return `${building.displayName} · ${building.city}, ${building.street} ${building.houseNumber}`;
}

export function UserBuildingOnboardingPanel({
  user,
  onboarding,
  buildingOptions,
  buildingSearchQ,
}: UserBuildingOnboardingPanelProps) {
  const [state, bindAction, pending] = useActionState(
    bindUserPendingOnboardingBuildingAction,
    initial,
  );
  const [selectedBuildingId, setSelectedBuildingId] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const bindFormRef = useRef<HTMLFormElement>(null);

  const feedback =
    state.targetUserId === user.id || !state.targetUserId ? state.message : undefined;

  const hasRepAssignment =
    user.assignment.kind === "building_rep" &&
    onboarding?.boundBuilding != null &&
    user.assignment.buildingId !== onboarding.boundBuilding.buildingId;

  const mcMissingCompanyBlocksPicker =
    user.role === UserRole.MANAGEMENT_COMPANY &&
    user.assignment.kind === "none" &&
    user.accountStatus === AccountStatus.ACTIVE;

  const canPickBuildings = Boolean(onboarding) && !hasRepAssignment && !mcMissingCompanyBlocksPicker;

  return (
    <section className={styles.detailCard} aria-labelledby="user-building-onboarding-heading">
      <h2 id="user-building-onboarding-heading" className={styles.workspaceTitle}>
        שיוך לבניינים
      </h2>
      <p className={styles.metaLine}>
        {user.fullName} · {formatAdminUserRoleHe(user.role)}
      </p>

      {user.accountStatus === AccountStatus.PENDING_APPROVAL ? (
        <p className={styles.metaLine}>{ADMIN_USER_ONBOARDING_PENDING_ACCOUNT_NOTE_HE}</p>
      ) : null}

      {user.role === UserRole.BUILDING_REP ? (
        <p className={styles.metaLine}>{ADMIN_USER_BUILDING_REP_SINGLE_BUILDING_HE}</p>
      ) : null}

      {mcMissingCompanyBlocksPicker ? (
        <p className={styles.metaLine}>{ADMIN_USER_MC_NO_COMPANY_HE}</p>
      ) : null}

      {user.assignment.kind === "building_rep" ? (
        <p className={styles.definitionValue}>
          שיוך תפעולי נוכחי: {user.assignment.buildingDisplayName}
        </p>
      ) : null}

      {user.assignment.kind === "management_company" ? (
        <div>
          <p className={styles.definitionValue}>
            {user.assignment.companyDisplayName} · {user.assignment.buildingCount} בניינים משויכים
          </p>
          {user.assignment.buildingSummaries.length > 0 ? (
            <ul className={styles.metaLine}>
              {user.assignment.buildingSummaries.map((building) => (
                <li key={building.buildingId}>
                  <Link href={`/app/admin/buildings/${building.buildingId}`}>
                    {building.displayName}
                  </Link>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}

      {user.assignment.kind === "none" && !onboarding?.boundBuilding ? (
        <p className={styles.metaLine}>אין עדיין שיוך תפעולי לבניין.</p>
      ) : null}

      {onboarding ? (
        <>
          <p className={styles.definitionValue}>
            בקשת הרשמה: {formatPendingOnboardingStatusHe(onboarding.status)}
          </p>
          {onboarding.boundBuilding ? (
            <p className={styles.metaLine}>
              בניין משויך לבקשה: {formatBuildingLine(onboarding.boundBuilding)}{" "}
              <Link href={`/app/admin/buildings/${onboarding.boundBuilding.buildingId}`}>
                לפתיחת הבניין
              </Link>
            </p>
          ) : (
            <p className={styles.metaLine}>טרם נבחר בניין לבקשת ההרשמה.</p>
          )}
        </>
      ) : (
        <p className={styles.metaLine}>לא נמצאה בקשת onboarding פתוחה למשתמש זה.</p>
      )}

      {hasRepAssignment ? (
        <p className={styles.feedbackError} role="status">
          למשתמש כבר משויך בניין אחר. יש להסיר את השיוך הקיים לפני שיוך לבניין חדש.
        </p>
      ) : null}

      {feedback ? (
        <p className={state.ok ? styles.feedbackSuccess : styles.feedbackError} role="status">
          {feedback}
        </p>
      ) : null}

      {onboarding && canPickBuildings && !hasRepAssignment ? (
        <>
          <form method="get" className={styles.filters}>
            <div className={styles.field}>
              <label className={styles.label} htmlFor="buildingQ">
                חיפוש בניין
              </label>
              <input
                id="buildingQ"
                name="buildingQ"
                className={styles.input}
                defaultValue={buildingSearchQ}
                placeholder="שם, עיר או רחוב"
              />
            </div>
            <Button type="submit" variant="secondary" size="sm">
              חיפוש
            </Button>
          </form>

          <form ref={bindFormRef} action={bindAction} className={styles.filters}>
            <input type="hidden" name="targetUserId" value={user.id} />
            <input type="hidden" name="onboardingRequestId" value={onboarding.onboardingRequestId} />
            <input
              type="hidden"
              name="expectedOnboardingStatus"
              value={onboarding.status}
            />
            <input
              type="hidden"
              name="expectedBoundBuildingId"
              value={onboarding.boundBuilding?.buildingId ?? ""}
            />
            <div className={styles.field}>
              <label className={styles.label} htmlFor="buildingId">
                בחירת בניין קיים
              </label>
              <select
                id="buildingId"
                name="buildingId"
                className={styles.select}
                required
                value={selectedBuildingId}
                onChange={(event) => setSelectedBuildingId(event.target.value)}
              >
                <option value="" disabled>
                  בחרו בניין ({buildingOptions.total} תוצאות)
                </option>
                {buildingOptions.items.map((building) => (
                  <option key={building.buildingId} value={building.buildingId}>
                    {formatBuildingLine(building)}
                    {building.representativeName ? ` · נציג: ${building.representativeName}` : ""}
                    {building.managementCompanyName
                      ? ` · ${building.managementCompanyName}`
                      : ""}
                  </option>
                ))}
              </select>
            </div>
            {buildingOptions.totalPages > 1 ? (
              <p className={styles.metaLine}>
                עמוד {buildingOptions.page} מתוך {buildingOptions.totalPages}. צמצמו חיפוש לתוצאות
                מדויקות יותר.
              </p>
            ) : null}
            <Button
              type="button"
              variant="primary"
              size="sm"
              disabled={pending || !selectedBuildingId}
              onClick={() => setConfirmOpen(true)}
            >
              שמירת שיוך לבקשת ההרשמה
            </Button>
          </form>

          <AdminConfirmDialog
            open={confirmOpen}
            title="לאשר שיוך הבניין לבקשת ההרשמה?"
            body={
              user.accountStatus === AccountStatus.ACTIVE
                ? "הבניין ישויך לבקשת ההרשמה. לחשבון מאושר יתווסף גם שיוך תפעולי (נציג או חברת ניהול) בהתאם לכללים הקיימים."
                : "הבניין ישויך לבקשת ההרשמה. אישור החשבון יישאר שלב נפרד; לאחר האישור יש לוודא שיוך תפעולי אם נדרש."
            }
            confirmLabel="שמירה"
            cancelLabel="ביטול"
            pending={pending}
            onCancel={() => setConfirmOpen(false)}
            onConfirm={() => {
              setConfirmOpen(false);
              bindFormRef.current?.requestSubmit();
            }}
          />
        </>
      ) : null}
    </section>
  );
}
