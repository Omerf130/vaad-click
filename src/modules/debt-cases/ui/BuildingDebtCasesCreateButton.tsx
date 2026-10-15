"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/Button/Button";
import type { PortalDebtCaseActionState } from "@/modules/debt-cases/actions/portal-debt-case.actions";
import styles from "@/modules/debt-cases/ui/DebtCases.module.scss";

const initial: PortalDebtCaseActionState = { ok: false };

type Props = {
  buildingId: string;
  action: (
    prev: PortalDebtCaseActionState,
    formData: FormData,
  ) => Promise<PortalDebtCaseActionState>;
};

export function BuildingDebtCasesCreateButton({ buildingId, action }: Props) {
  const [state, formAction, pending] = useActionState(action, initial);

  return (
    <form action={formAction} className={styles.actions}>
      <input type="hidden" name="buildingId" value={buildingId} />
      <Button type="submit" disabled={pending}>
        {pending ? "יוצר תיק…" : "תיק חוב חדש"}
      </Button>
      {state.message && !state.ok ? (
        <p className={styles.feedbackError} role="alert">
          {state.message}
        </p>
      ) : null}
    </form>
  );
}
