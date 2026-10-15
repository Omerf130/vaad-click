import Link from "next/link";
import { redirect } from "next/navigation";

import { Container } from "@/components/ui";
import { Card } from "@/components/ui/Card/Card";
import { getDebtCase } from "@/modules/debt-cases/services/debt-case.service";
import { debtCaseRecordToFormDefaults } from "@/modules/debt-cases/presentation/debt-case-form.defaults";
import { DebtCaseOperatorForm } from "@/modules/debt-cases/ui/DebtCaseOperatorForm";
import { requireOperatorBuildingPortalAccess } from "@/shared/auth/require-operator-building-access";
import styles from "../../../../../portal.module.scss";
import debtStyles from "@/modules/debt-cases/ui/DebtCases.module.scss";

type PageProps = {
  params: Promise<{ buildingId: string; debtCaseId: string }>;
};

export default async function PortalDebtCaseDetailPage({ params }: PageProps) {
  const { buildingId, debtCaseId } = await params;
  const { context } = await requireOperatorBuildingPortalAccess(buildingId);

  const record = await getDebtCase({ context, debtCaseId });
  if (record.buildingId !== buildingId) {
    redirect("/forbidden?reason=building");
  }

  const defaults = debtCaseRecordToFormDefaults(record);

  return (
    <Container>
      <Card className={`${styles.card} ${debtStyles.section}`} style={{ maxWidth: "48rem" }}>
        <h1 className={styles.title}>תיק חוב</h1>
        <p className={styles.linkRow}>
          <Link href={`/app/buildings/${buildingId}`}>חזרה לבניין</Link>
        </p>
        <DebtCaseOperatorForm buildingId={buildingId} record={record} defaults={defaults} />
      </Card>
    </Container>
  );
}
