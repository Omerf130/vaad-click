import Link from "next/link";
import { Container } from "@/components/ui";
import { Card } from "@/components/ui/Card/Card";
import { UserRole } from "@/modules/users/domain/user-role";
import { requireDevelopmentPortalAccess } from "@/shared/auth/require-access";
import styles from "../portal.module.scss";

export default async function AppPortalPage() {
  const { user } = await requireDevelopmentPortalAccess();

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
          זהו אזור מחובר זמני לפיתוח. אין עדיין שיוך לבניין או לחברה — תהליכי
          הרשאה ואישור יתווספו ב-checkpoints הבאים.
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
