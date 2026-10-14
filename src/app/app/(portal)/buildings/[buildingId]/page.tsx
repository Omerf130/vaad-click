import Link from "next/link";
import { Container } from "@/components/ui";
import { Card } from "@/components/ui/Card/Card";
import { requireBuildingPortalAccess } from "@/shared/auth/require-building-access";
import styles from "../../../portal.module.scss";

type PageProps = {
  params: Promise<{ buildingId: string }>;
};

export default async function PortalBuildingDetailPage({ params }: PageProps) {
  const { buildingId } = await params;
  const { building } = await requireBuildingPortalAccess(buildingId);

  return (
    <Container>
      <Card className={styles.card}>
        <h1 className={styles.title}>{building.displayName}</h1>
        <p className={styles.meta}>מזהה בניין: {building.buildingId}</p>
        <p className={styles.body}>
          זהו דף הוכחה לגישה מבוססת הרשאה בשרת. ממשקים תפעוליים נוספים יתווספו
          ב-checkpoints הבאים.
        </p>
        <p className={styles.linkRow}>
          <Link href="/app/buildings">חזרה לרשימת הבניינים</Link>
        </p>
      </Card>
    </Container>
  );
}
