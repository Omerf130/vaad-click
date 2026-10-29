"use client";

import { useActionState, useRef, useState, type RefObject } from "react";

import { Button } from "@/components/ui/Button/Button";
import { AdminConfirmDialog } from "@/modules/admin/components/AdminConfirmDialog";
import {
  updateBuildingTreatmentFeeEligibilityFormAction,
  type AdminBuildingActionState,
} from "@/modules/buildings/actions/admin-building.actions";
import {
  BUILDING_TREATMENT_FEE_EXPLANATION_HE,
  formatTreatmentFeeEligibleStatusHe,
} from "@/modules/buildings/presentation/building-treatment-fee.he";
import type { AdminBuildingDetail } from "@/modules/buildings/services/admin-building-query.service";
import styles from "@/modules/users/ui/AdminUsers.module.scss";

type BuildingTreatmentFeeEligibilityPanelProps = {
  building: AdminBuildingDetail;
};

const initial: AdminBuildingActionState = { ok: false };

function formatUpdatedAtHe(iso: string | null): string | null {
  if (!iso) {
    return null;
  }
  try {
    return new Intl.DateTimeFormat("he-IL", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(iso));
  } catch {
    return null;
  }
}

type DraftFormProps = {
  building: AdminBuildingDetail;
  formAction: (payload: FormData) => void;
  pending: boolean;
  formRef: RefObject<HTMLFormElement | null>;
};

function TreatmentFeeEligibilityDraftForm({
  building,
  formAction,
  pending,
  formRef,
}: DraftFormProps) {
  const [draftEligible, setDraftEligible] = useState(building.treatmentFeeEligible);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const hasPendingChange = draftEligible !== building.treatmentFeeEligible;

  return (
    <>
      <form ref={formRef} action={formAction} className={styles.filters}>
        <input type="hidden" name="buildingId" value={building.buildingId} />
        <input
          type="hidden"
          name="expectedTreatmentFeeEligible"
          value={building.treatmentFeeEligible ? "true" : "false"}
        />
        <fieldset className={styles.field}>
          <legend className={styles.label}>שינוי סטטוס (עורך דין בלבד)</legend>
          <label className={styles.metaLine}>
            <input
              type="radio"
              name="treatmentFeeEligible"
              value="false"
              checked={!draftEligible}
              onChange={() => setDraftEligible(false)}
            />{" "}
            ללא בסיס להוצאות טיפול — נוסח בלוק תשלום ללא הוצאות טיפול
          </label>
          <label className={styles.metaLine}>
            <input
              type="radio"
              name="treatmentFeeEligible"
              value="true"
              checked={draftEligible}
              onChange={() => setDraftEligible(true)}
            />{" "}
            עם בסיס להוצאות טיפול — נוסח בלוק תשלום כולל הוצאות טיפול (בכפוף להגדרות כספיות מפורסמות)
          </label>
        </fieldset>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          disabled={pending || !hasPendingChange}
          onClick={() => setConfirmOpen(true)}
        >
          שמירת סטטוס הוצאות טיפול
        </Button>
      </form>

      <AdminConfirmDialog
        open={confirmOpen}
        title="לאשר שינוי סטטוס הוצאות טיפול?"
        body={
          draftEligible
            ? "הבניין יסומן כבעל בסיס להוצאות טיפול. טיוטות ותצוגות מקדימות חדשות ישתמשו בנוסח עם הוצאות טיפול; מכתבים שכבר נסגרו לא ישתנו."
            : "הסימון להוצאות טיפול יוסר. טיוטות ותצוגות מקדימות חדשות ישתמשו בנוסח ללא הוצאות טיפול; מכתבים שכבר נסגרו לא ישתנו."
        }
        confirmLabel="שמירה"
        cancelLabel="ביטול"
        pending={pending}
        onCancel={() => setConfirmOpen(false)}
        onConfirm={() => {
          setConfirmOpen(false);
          formRef.current?.requestSubmit();
        }}
      />
    </>
  );
}

export function BuildingTreatmentFeeEligibilityPanel({
  building,
}: BuildingTreatmentFeeEligibilityPanelProps) {
  const [state, formAction, pending] = useActionState(
    updateBuildingTreatmentFeeEligibilityFormAction,
    initial,
  );
  const formRef = useRef<HTMLFormElement>(null);

  const updatedAtLabel = formatUpdatedAtHe(building.treatmentFeeEligibleUpdatedAt);
  const actorLabel = building.treatmentFeeEligibleUpdatedBy?.fullName ?? null;
  const feedbackMessage =
    state.buildingId === building.buildingId || !state.buildingId ? state.message : undefined;

  return (
    <section className={styles.detailCard}>
      <h2 className={styles.workspaceTitle}>הוצאות טיפול במכתבי התראה</h2>
      <p className={styles.definitionValue}>
        {formatTreatmentFeeEligibleStatusHe(building.treatmentFeeEligible)}
      </p>
      <p className={styles.metaLine}>{BUILDING_TREATMENT_FEE_EXPLANATION_HE}</p>
      {updatedAtLabel || actorLabel ? (
        <p className={styles.metaLine}>
          {updatedAtLabel ? `עודכן לאחרונה: ${updatedAtLabel}` : null}
          {updatedAtLabel && actorLabel ? " · " : null}
          {actorLabel ? `על ידי: ${actorLabel}` : null}
        </p>
      ) : (
        <p className={styles.metaLine}>טרם עודכן ידנית במערכת (ברירת מחדל: ללא הוצאות טיפול).</p>
      )}

      {feedbackMessage ? (
        <p className={state.ok ? styles.feedbackSuccess : styles.feedbackError} role="status">
          {feedbackMessage}
        </p>
      ) : null}

      <TreatmentFeeEligibilityDraftForm
        building={building}
        formAction={formAction}
        pending={pending}
        formRef={formRef}
      />
    </section>
  );
}
