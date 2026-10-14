import Link from "next/link";
import { Container } from "@/components/ui";
import { Card } from "@/components/ui/Card/Card";
import { UserRole } from "@/modules/users/domain/user-role";
import { listAccessibleBuildings } from "@/shared/auth/building-access";
import { requireOperationalPortalAccess } from "@/shared/auth/require-access";
import styles from "../portal.module.scss";

export default async function AppPortalPage() {
  const context = await requireOperationalPortalAccess();
  const { user } = context;
  const buildings = await listAccessibleBuildings({ context });
  const hasBuildings = buildings.length > 0;

  const roleLabel =
    user.role === UserRole.BUILDING_REP
      ? "נציגות בית משותף"
      : user.role === UserRole.MANAGEMENT_COMPANY
        ? "חברת ניהול"
        : "מנהל משרד עורכי דין";

  return (
    <Container>
      <Card className={styles.card}>
        <h1 className={styles.title}>שלום, {user.fullName}</h1>
        <p className={styles.meta}>
          {roleLabel} · {user.email}
        </p>
        <p className={styles.body}>
          {user.role === UserRole.LAWYER_ADMIN
            ? hasBuildings
              ? "גישה גלובלית לבניינים פעילים במערכת."
              : "אין עדיין בניינים פעילים במערכת."
            : hasBuildings
              ? "יש לך גישה לבניינים משויכים. נתונים תפעוליים יוצגו רק בהקשר בניין מורשה."
              : "החשבון מאושר, אך אין עדיין בניין משויך. מנהל המשרד ישייך בניין כאשר יהיה מוכן."}
        </p>
        <p className={styles.linkRow}>
          <Link href="/app/buildings">בניינים נגישים</Link>
        </p>
        {user.role === UserRole.LAWYER_ADMIN ? (
          <p className={styles.linkRow}>
            <Link href="/app/admin">מעבר לדף מנהל המשרד</Link>
          </p>
        ) : null}
      </Card>
    </Container>
  );
}
