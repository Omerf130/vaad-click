import Link from "next/link";

import { listDebtCaseIntakeDrafts } from "@/modules/debt-cases/services/debt-case-intake.service";
import { OperatorPortalPageFrame } from "@/modules/portal/ui/OperatorPortalPageFrame";
import { requireOperationalPortalAccess } from "@/shared/auth/require-access";
import styles from "@/modules/portal/ui/OperatorPortalDashboard.module.scss";

export default async function IntakeDraftListPage() {
  const context = await requireOperationalPortalAccess();
  const drafts = await listDebtCaseIntakeDrafts(context);

  return (
    <OperatorPortalPageFrame
      title="טיוטות קליטת תיק"
      subtitle="המשיכו עריכה והגישו כשהנתונים מוכנים."
      breadcrumbs={[
        { label: "לוח בקרה", href: "/app" },
        { label: "טיוטות קליטה", href: "/app/debt-cases/intake" },
      ]}
    >
      {drafts.length === 0 ? (
        <p className={styles.sectionHint}>אין טיוטות שמורות.</p>
      ) : (
        <ul className={styles.actionList}>
          {drafts.map((row) => (
            <li key={row.intakeDraftId} className={styles.actionItem}>
              <span>
                עודכן: {row.updatedAt?.toLocaleString("he-IL") ?? "—"}
              </span>
              <Link href={`/app/debt-cases/intake/${row.intakeDraftId}`}>המשך עריכה</Link>
            </li>
          ))}
        </ul>
      )}
      <p className={styles.sectionHint}>
        <Link href="/app/debt-cases/new">פתיחת תיק חייב חדש</Link>
      </p>
    </OperatorPortalPageFrame>
  );
}
