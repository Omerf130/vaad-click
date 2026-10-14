"use client";

import { useActionState, useRef, useState, type RefObject } from "react";

import { Button } from "@/components/ui/Button/Button";
import { AdminConfirmDialog } from "@/modules/admin/components/AdminConfirmDialog";
import { AccountStatus } from "@/modules/users/domain/account-status";
import {
  approveRegisteredUserAction,
  reconsiderRejectedUserAction,
  rejectRegisteredUserAction,
  type AdminUserActionState,
} from "@/modules/users/actions/admin-user.actions";
import { ADMIN_USER_UI_COPY } from "@/modules/users/presentation/admin-user-labels.he";
import styles from "@/modules/users/ui/AdminUsers.module.scss";

type ReviewKind = "approve" | "reject" | "reconsider";

type UserAccountReviewPanelProps = {
  userId: string;
  accountStatus: AccountStatus;
};

const initialState: AdminUserActionState = { ok: false };

export function UserAccountReviewPanel({ userId, accountStatus }: UserAccountReviewPanelProps) {
  const [dialog, setDialog] = useState<ReviewKind | null>(null);
  const approveFormRef = useRef<HTMLFormElement>(null);
  const rejectFormRef = useRef<HTMLFormElement>(null);
  const reconsiderFormRef = useRef<HTMLFormElement>(null);

  const [approveState, approveAction, approvePending] = useActionState(
    approveRegisteredUserAction,
    initialState,
  );
  const [rejectState, rejectAction, rejectPending] = useActionState(
    rejectRegisteredUserAction,
    initialState,
  );
  const [reconsiderState, reconsiderAction, reconsiderPending] = useActionState(
    reconsiderRejectedUserAction,
    initialState,
  );

  const feedback = [approveState, rejectState, reconsiderState].find((state) => state.message);

  const closeDialog = () => setDialog(null);

  const submitForm = (formRef: RefObject<HTMLFormElement | null>) => {
    formRef.current?.requestSubmit();
  };

  return (
    <div>
      <p className={styles.notice}>{ADMIN_USER_UI_COPY.approvalNote}</p>
      {feedback?.message ? (
        <p
          className={feedback.ok ? styles.feedbackSuccess : styles.feedbackError}
          role="status"
        >
          {feedback.message}
        </p>
      ) : null}

      <div className={styles.reviewActions}>
        {accountStatus === AccountStatus.PENDING_APPROVAL ? (
          <>
            <Button type="button" variant="primary" onClick={() => setDialog("approve")}>
              {ADMIN_USER_UI_COPY.approveAction}
            </Button>
            <Button type="button" variant="secondary" onClick={() => setDialog("reject")}>
              {ADMIN_USER_UI_COPY.rejectAction}
            </Button>
          </>
        ) : null}
        {accountStatus === AccountStatus.REJECTED ? (
          <Button type="button" variant="primary" onClick={() => setDialog("reconsider")}>
            {ADMIN_USER_UI_COPY.reconsiderAction}
          </Button>
        ) : null}
      </div>

      <form ref={approveFormRef} action={approveAction} className={styles.visuallyHidden}>
        <input type="hidden" name="targetUserId" value={userId} />
      </form>
      <form ref={rejectFormRef} action={rejectAction} className={styles.visuallyHidden}>
        <input type="hidden" name="targetUserId" value={userId} />
      </form>
      <form ref={reconsiderFormRef} action={reconsiderAction} className={styles.visuallyHidden}>
        <input type="hidden" name="targetUserId" value={userId} />
      </form>

      <AdminConfirmDialog
        open={dialog === "approve"}
        title={ADMIN_USER_UI_COPY.approveConfirmTitle}
        body={ADMIN_USER_UI_COPY.approveConfirmBody}
        confirmLabel={ADMIN_USER_UI_COPY.confirmAction}
        cancelLabel={ADMIN_USER_UI_COPY.cancelAction}
        pending={approvePending}
        errorMessage={approveState.ok ? undefined : approveState.message}
        onCancel={closeDialog}
        onConfirm={() => {
          closeDialog();
          submitForm(approveFormRef);
        }}
      />

      <AdminConfirmDialog
        open={dialog === "reject"}
        title={ADMIN_USER_UI_COPY.rejectConfirmTitle}
        body={ADMIN_USER_UI_COPY.rejectConfirmBody}
        confirmLabel={ADMIN_USER_UI_COPY.rejectAction}
        cancelLabel={ADMIN_USER_UI_COPY.cancelAction}
        pending={rejectPending}
        destructive
        errorMessage={rejectState.ok ? undefined : rejectState.message}
        onCancel={closeDialog}
        onConfirm={() => {
          closeDialog();
          submitForm(rejectFormRef);
        }}
      />

      <AdminConfirmDialog
        open={dialog === "reconsider"}
        title={ADMIN_USER_UI_COPY.reconsiderConfirmTitle}
        body={ADMIN_USER_UI_COPY.reconsiderConfirmBody}
        confirmLabel={ADMIN_USER_UI_COPY.confirmAction}
        cancelLabel={ADMIN_USER_UI_COPY.cancelAction}
        pending={reconsiderPending}
        errorMessage={reconsiderState.ok ? undefined : reconsiderState.message}
        onCancel={closeDialog}
        onConfirm={() => {
          closeDialog();
          submitForm(reconsiderFormRef);
        }}
      />
    </div>
  );
}
