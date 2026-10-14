import Link from "next/link";
import { Container } from "@/components/ui";
import { Card } from "@/components/ui/Card/Card";
import { UserRole } from "@/modules/users/domain/user-role";
import {
  hasOperationalBuildingScope,
  listAccessibleBuildings,
  resolveBuildingAccessScope,
} from "@/shared/auth/building-access";
import { requireOperationalPortalAccess } from "@/shared/auth/require-access";
import styles from "../../portal.module.scss";

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
    <Container>
      <Card className={styles.card}>
        <h1 className={styles.title}>בניינים נגישים</h1>
        <p className={styles.body}>{intro}</p>
        {buildings.length === 0 ? (
          <p className={styles.meta}>אין בניינים להצגה.</p>
        ) : (
          <ul className={styles.linkRow}>
            {buildings.map((building) => (
              <li key={building.buildingId}>
                <Link href={`/app/buildings/${building.buildingId}`}>
                  {building.displayName}
                </Link>
              </li>
            ))}
          </ul>
        )}
        <p className={styles.linkRow}>
          <Link href="/app">חזרה לאזור המחובר</Link>
        </p>
      </Card>
    </Container>
  );
}
