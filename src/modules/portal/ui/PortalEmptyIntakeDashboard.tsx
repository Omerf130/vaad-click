import Link from "next/link";

import { ButtonLink } from "@/components/ui/Button/ButtonLink";
import styles from "@/modules/portal/ui/OperatorPortalDashboard.module.scss";

export function PortalEmptyIntakeDashboard() {
  return (
    <section className={styles.emptyIntakeSection} aria-labelledby="empty-intake-title">
      <h2 id="empty-intake-title" className={styles.sectionTitle}>
        ברוכים הבאים
      </h2>
      <p className={styles.emptyIntakeLead}>
        אפשר לפתוח תיק חייב חדש כבר עכשיו. פרטי הבניין יישמרו יחד עם התיק ויטופלו במערכת באופן
        מאובטח.
      </p>
      <div className={styles.emptyIntakeActions}>
        <ButtonLink href="/app/debt-cases/new" variant="primary">
          פתיחת תיק חייב חדש
        </ButtonLink>
        <ButtonLink href="/app/debt-cases/intake" variant="secondary">
          טיוטות שמורות
        </ButtonLink>
      </div>
      <p className={styles.emptyIntakeAccountLink}>
        <Link href="/app/account-status">סטטוס חשבון ואישור לקוח</Link>
      </p>
    </section>
  );
}
