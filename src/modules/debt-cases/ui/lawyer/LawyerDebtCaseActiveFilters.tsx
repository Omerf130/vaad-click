import Link from "next/link";

import { describeLawyerDebtCaseActiveFilters } from "@/modules/debt-cases/presentation/lawyer-debt-case-list-filters";
import type { LawyerDebtCaseBuildingOption } from "@/modules/debt-cases/services/lawyer-debt-case-query.service";
import { LAWYER_DEBT_CASE_LIST_CLEAR_HREF } from "@/modules/debt-cases/ui/lawyer/lawyer-debt-case-list-url";
import styles from "@/modules/debt-cases/ui/lawyer/LawyerDebtCasesAdmin.module.scss";
import type { LawyerDebtCaseListParams } from "@/modules/debt-cases/validation/lawyer-debt-case-list.schema";

type Props = {
  params: LawyerDebtCaseListParams;
  buildings: LawyerDebtCaseBuildingOption[];
};

export function LawyerDebtCaseActiveFilters({ params, buildings }: Props) {
  const buildingNameById = new Map(buildings.map((b) => [b.buildingId, b.displayName]));
  const active = describeLawyerDebtCaseActiveFilters(params, buildingNameById);

  return (
    <div className={styles.activeFilters} aria-label="מסננים פעילים">
      {active.map((filter) => (
        <span key={filter.key} className={styles.filterChip}>
          {filter.label}
        </span>
      ))}
      <Link href={LAWYER_DEBT_CASE_LIST_CLEAR_HREF}>ניקוי סינונים</Link>
    </div>
  );
}
