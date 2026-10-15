import Link from "next/link";

import { Container } from "@/components/ui";
import { Card } from "@/components/ui/Card/Card";
import { listDebtCasesForBuilding } from "@/modules/debt-cases/services/debt-case.service";
import { BuildingDebtCasesPanel } from "@/modules/debt-cases/ui/BuildingDebtCasesPanel";
import { UserRole } from "@/modules/users/domain/user-role";
import { requireBuildingPortalAccess } from "@/shared/auth/require-building-access";
import styles from "../../../portal.module.scss";
import debtStyles from "@/modules/debt-cases/ui/DebtCases.module.scss";

type PageProps = {
  params: Promise<{ buildingId: string }>;
};

export default async function PortalBuildingDetailPage({ params }: PageProps) {
  const { buildingId } = await params;
  const { context, building } = await requireBuildingPortalAccess(buildingId);

  const isOperator =
    context.user.role === UserRole.BUILDING_REP ||
    context.user.role === UserRole.MANAGEMENT_COMPANY;

  const debtCases = isOperator
    ? await listDebtCasesForBuilding({ context, buildingId })
    : [];

  return (
    <Container>
      <Card className={styles.card} style={{ maxWidth: isOperator ? "56rem" : undefined }}>
        <h1 className={styles.title}>{building.displayName}</h1>
        <p className={styles.meta}>מזהה בניין: {building.buildingId}</p>
        <p className={styles.body}>
          {isOperator
            ? "ניהול תיקי חוב לבניין — שמירת טיוטות והגשה לבדיקת עורך דין (לא שליחת מכתב)."
            : "תצוגת בניין."}
        </p>
        <p className={styles.linkRow}>
          <Link href="/app/buildings">חזרה לרשימת הבניינים</Link>
        </p>

        {isOperator ? (
          <div className={debtStyles.section}>
            <BuildingDebtCasesPanel buildingId={buildingId} cases={debtCases} />
          </div>
        ) : null}
      </Card>
    </Container>
  );
}
