"use client";

import { useRouter } from "next/navigation";
import { useActionState, useEffect, useRef, useState, startTransition } from "react";

import { Button } from "@/components/ui/Button/Button";
import { AdminConfirmDialog } from "@/modules/admin/components/AdminConfirmDialog";
import {
  approveDebtCaseReviewFormAction,
  rejectDebtCaseReviewFormAction,
  returnDebtCaseReviewFormAction,
} from "@/modules/debt-cases/actions/admin-debt-case-review.actions";
import {
  adminDebtCaseReviewActionInitialState,
  type AdminDebtCaseReviewActionState,
} from "@/modules/debt-cases/presentation/admin-debt-case-review-action-state";
import {
  isLawyerDebtCaseReviewInteractionLocked,
  pickLawyerDebtCaseReviewActionFeedback,
  planLawyerReviewConfirmDispatch,
  runLawyerDebtCaseReviewActionInTransition,
  type LawyerReviewConfirmKind,
} from "@/modules/debt-cases/presentation/lawyer-debt-case-review-action-dispatch";
import styles from "@/modules/debt-cases/ui/lawyer/LawyerDebtCasesAdmin.module.scss";

type Props = {
  debtCaseId: string;
  revision: number;
};

export function LawyerDebtCaseReviewActions({ debtCaseId, revision }: Props) {
  const router = useRouter();
  const [confirm, setConfirm] = useState<LawyerReviewConfirmKind | null>(null);
  const [comment, setComment] = useState("");
  const confirmDispatchStartedRef = useRef(false);

  const [approveState, approveAction, approvePending] = useActionState(
    approveDebtCaseReviewFormAction,
    adminDebtCaseReviewActionInitialState,
  );
  const [returnState, returnAction, returnPending] = useActionState(
    returnDebtCaseReviewFormAction,
    adminDebtCaseReviewActionInitialState,
  );
  const [rejectState, rejectAction, rejectPending] = useActionState(
    rejectDebtCaseReviewFormAction,
    adminDebtCaseReviewActionInitialState,
  );

  const pending = approvePending || returnPending || rejectPending;

  const feedback: AdminDebtCaseReviewActionState | undefined = pickLawyerDebtCaseReviewActionFeedback(
    [approveState, returnState, rejectState],
  );

  useEffect(() => {
    if (!pending) {
      confirmDispatchStartedRef.current = false;
    }
  }, [pending]);

  useEffect(() => {
    if (approveState.ok || returnState.ok || rejectState.ok) {
      router.refresh();
    }
  }, [approveState.ok, returnState.ok, rejectState.ok, router]);

  const dispatchForConfirm = (kind: LawyerReviewConfirmKind, formData: FormData) => {
    if (kind === "approve") {
      runLawyerDebtCaseReviewActionInTransition(approveAction, formData, startTransition);
      return;
    }
    if (kind === "return") {
      runLawyerDebtCaseReviewActionInTransition(returnAction, formData, startTransition);
      return;
    }
    runLawyerDebtCaseReviewActionInTransition(rejectAction, formData, startTransition);
  };

  const handleConfirm = () => {
    if (
      isLawyerDebtCaseReviewInteractionLocked({
        actionPending: pending,
        confirmDispatchStarted: confirmDispatchStartedRef.current,
      })
    ) {
      return;
    }

    const plan = planLawyerReviewConfirmDispatch({
      confirm,
      debtCaseId,
      revision,
      comment,
    });

    if (plan.kind === "blocked") {
      return;
    }

    confirmDispatchStartedRef.current = true;
    dispatchForConfirm(plan.confirm, plan.formData);
    setConfirm(null);
    if (plan.confirm !== "approve") {
      setComment("");
    }
  };

  return (
    <section className={styles.section} aria-labelledby="review-actions-title">
      <h2 id="review-actions-title" className={styles.sectionTitle}>
        החלטת בדיקה
      </h2>
      <p className={styles.bannerInfo}>
        פעולות אלו מעדכנות את סטטוס הבדיקה בלבד. הן אינן שולחות מכתב ואינן מפעילות גבייה.
      </p>

      {feedback?.message ? (
        <p className={feedback.ok ? styles.feedbackSuccess : styles.feedbackError} role="status">
          {feedback.message}
        </p>
      ) : null}

      <div className={styles.actionsRow}>
        <Button type="button" disabled={pending} onClick={() => setConfirm("approve")}>
          אישור להכנת מכתב
        </Button>
        <Button type="button" variant="secondary" disabled={pending} onClick={() => setConfirm("return")}>
          החזרה להשלמה
        </Button>
        <Button type="button" variant="secondary" disabled={pending} onClick={() => setConfirm("reject")}>
          דחיית תיק
        </Button>
      </div>

      <AdminConfirmDialog
        open={confirm !== null}
        title={
          confirm === "approve"
            ? "לאשר תיק להכנת מכתב?"
            : confirm === "return"
              ? "להחזיר את התיק לנציג?"
              : "לדחות את התיק?"
        }
        body={
          confirm === "approve" ? (
            <p>
              האישור מאפשר המשך הכנה פנימית בלבד. שליחת מכתב תדרוש מוכנות משפטית מלאה ופעולה
              נפרדת בעתיד.
            </p>
          ) : (
            <>
              <p>נדרשת סיבה או הערה לנציג (לפחות 3 תווים).</p>
              <label className={styles.label} htmlFor="reviewCommentHe">
                הערה
              </label>
              <textarea
                id="reviewCommentHe"
                name="reviewCommentHe"
                className={styles.textarea}
                value={comment}
                onChange={(event) => setComment(event.target.value)}
                disabled={pending}
              />
            </>
          )
        }
        confirmLabel={confirm === "approve" ? "אישור" : confirm === "return" ? "החזרה" : "דחייה"}
        cancelLabel="ביטול"
        destructive={confirm === "reject"}
        pending={pending}
        errorMessage={
          !pending && confirm !== "approve" && comment.trim().length > 0 && comment.trim().length < 3
            ? "נדרשים לפחות 3 תווים."
            : undefined
        }
        onCancel={() => {
          if (!pending) {
            setConfirm(null);
          }
        }}
        onConfirm={handleConfirm}
      />
    </section>
  );
}
