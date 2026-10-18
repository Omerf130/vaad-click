import Link from "next/link";

import { UserRole } from "@/modules/users/domain/user-role";
import {
  hasOperationalBuildingScope,
  listAccessibleBuildings,
  resolveBuildingAccessScope,
} from "@/shared/auth/building-access";
import { requireOperationalPortalAccess } from "@/shared/auth/require-access";
import { OPERATOR_PORTAL_ROUTES } from "@/modules/portal/presentation/operator-portal-nav";
import { OperatorPortalPageFrame } from "@/modules/portal/ui/OperatorPortalPageFrame";
import styles from "@/modules/portal/ui/OperatorPortalDashboard.module.scss";

export default async function PortalBuildingsPage() {
  const context = await requireOperationalPortalAccess();
  const scope = await resolveBuildingAccessScope(context);
  const buildings = await listAccessibleBuildings({ context });

  let intro = "אין בניינים זמינים לחשבון זה. מנהל המשרד ישייך בניין כאשר יהיה מוכן.";
  if (context.user.role === UserRole.LAWYER_ADMIN) {
    intro = "תצוגת בניינים פעילים במערכת (גישה גלובלית למנהל המשרד).";
  } else if (hasOperationalBuildingScope(scope)) {
    intro = "בניינים שיש לך הרשאה לצפות בהם:";
  }

  return (
    <OperatorPortalPageFrame
      title="בניינים נגישים"
      subtitle={intro}
      breadcrumbs={[
        { label: "לוח בקרה", href: OPERATOR_PORTAL_ROUTES.home },
        { label: "בניינים" },
      ]}
    >
      {buildings.length === 0 ? (
        <p className={styles.emptyState}>אין בניינים להצגה.</p>
      ) : (
        <ul className={styles.buildingList}>
          {buildings.map((building) => (
            <li key={building.buildingId}>
              <Link href={`/app/buildings/${building.buildingId}`} className={styles.buildingListLink}>
                {building.displayName}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </OperatorPortalPageFrame>
  );
}
