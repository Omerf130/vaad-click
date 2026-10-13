"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/Button/Button";
import {
  setInitialLawyerPasswordAction,
  type SetInitialPasswordState,
} from "@/modules/auth/actions/set-initial-lawyer-password.action";
import fieldStyles from "./AuthFormFields.module.scss";

const initialState: SetInitialPasswordState = { ok: true };

type SetInitialLawyerPasswordFormProps = {
  setupToken: string;
};

export function SetInitialLawyerPasswordForm({
  setupToken,
}: SetInitialLawyerPasswordFormProps) {
  const [state, formAction, pending] = useActionState(
    setInitialLawyerPasswordAction,
    initialState,
  );

  return (
    <form action={formAction} className={fieldStyles.form} noValidate>
      <input type="hidden" name="setupToken" value={setupToken} readOnly />

      <div className={fieldStyles.field}>
        <label className={fieldStyles.label} htmlFor="setup-password">
          סיסמה חדשה
        </label>
        <input
          id="setup-password"
          name="password"
          type="password"
          autoComplete="new-password"
          required
          className={fieldStyles.input}
        />
        {state.fieldErrors?.password ? (
          <p className={fieldStyles.fieldError}>{state.fieldErrors.password[0]}</p>
        ) : null}
      </div>

      <div className={fieldStyles.field}>
        <label className={fieldStyles.label} htmlFor="setup-confirm">
          אימות סיסמה
        </label>
        <input
          id="setup-confirm"
          name="confirmPassword"
          type="password"
          autoComplete="new-password"
          required
          className={fieldStyles.input}
        />
      </div>

      {state.message && !state.ok ? (
        <p className={fieldStyles.formError} role="alert">
          {state.message}
        </p>
      ) : null}

      <div className={fieldStyles.actions}>
        <Button type="submit" variant="primary" disabled={pending}>
          {pending ? "שומר…" : "שמירת סיסמה"}
        </Button>
      </div>
    </form>
  );
}
