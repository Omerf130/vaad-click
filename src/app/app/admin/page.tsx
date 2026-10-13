import { Container } from "@/components/ui";
import { Card } from "@/components/ui/Card/Card";
import { SessionAuthStage } from "@/modules/auth/domain/session-types";
import { requireLawyerAdminPortal } from "@/shared/auth/require-access";
import { isProduction } from "@/shared/config/env.server";
import styles from "../portal.module.scss";

export default async function LawyerAdminPortalPage() {
  const { user, session } = await requireLawyerAdminPortal();

  const productionBlocked =
    isProduction() && session.authStage !== SessionAuthStage.MFA_COMPLETE;

  return (
    <Container>
      <Card className={styles.card}>
        <h1 className={styles.title}>מנהל משרד — אזור פיתוח</h1>
        <p className={styles.meta}>{user.fullName} · {user.email}</p>
        {productionBlocked ? (
          <p className={styles.body} role="alert">
            גישה לנתונים משפטיים רגישים ב-production חסומה עד להשלמת MFA (דרישת
            CP0). כניסה זו מיועדת לפיתוח בלבד.
          </p>
        ) : (
          <p className={styles.body}>
            זהו דף נחיתה זמני למנהל המשרד. לוחות בקרה, אישור בניינים ותיקים
            יתווספו ב-checkpoints הבאים. ב-production יידרש MFA לפני גישה לתהליכים
            משפטיים.
          </p>
        )}
      </Card>
    </Container>
  );
}
