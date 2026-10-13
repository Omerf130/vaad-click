"use client";

import Link from "next/link";
import { useActionState } from "react";
import { Button } from "@/components/ui/Button/Button";
import {
  loginAction,
  type AuthActionState,
} from "@/modules/auth/actions/auth.actions";
import fieldStyles from "./AuthFormFields.module.scss";

const initialState: AuthActionState = { ok: true };

type LoginFormProps = {
  returnTo?: string | null;
};

export function LoginForm({ returnTo }: LoginFormProps) {
  const [state, formAction, pending] = useActionState(loginAction, initialState);

  return (
    <form action={formAction} className={fieldStyles.form} noValidate>
      {returnTo ? <input type="hidden" name="returnTo" value={returnTo} /> : null}

      <div className={fieldStyles.field}>
        <label className={fieldStyles.label} htmlFor="login-email">
          דוא&quot;ל
        </label>
        <input
          id="login-email"
          name="email"
          type="email"
          autoComplete="email"
          required
          className={fieldStyles.input}
          aria-invalid={Boolean(state.fieldErrors?.email)}
          aria-describedby={state.fieldErrors?.email ? "login-email-error" : undefined}
        />
        {state.fieldErrors?.email ? (
          <p id="login-email-error" className={fieldStyles.fieldError}>
            {state.fieldErrors.email[0]}
          </p>
        ) : null}
      </div>

      <div className={fieldStyles.field}>
        <label className={fieldStyles.label} htmlFor="login-password">
          סיסמה
        </label>
        <input
          id="login-password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          className={fieldStyles.input}
          aria-invalid={Boolean(state.fieldErrors?.password)}
          aria-describedby={
            state.fieldErrors?.password ? "login-password-error" : undefined
          }
        />
        {state.fieldErrors?.password ? (
          <p id="login-password-error" className={fieldStyles.fieldError}>
            {state.fieldErrors.password[0]}
          </p>
        ) : null}
      </div>

      {state.message && !state.ok ? (
        <p className={fieldStyles.formError} role="alert">
          {state.message}
        </p>
      ) : null}

      <div className={fieldStyles.actions}>
        <Button type="submit" variant="primary" disabled={pending}>
          {pending ? "מתחבר…" : "כניסה"}
        </Button>
      </div>

      <p className={fieldStyles.footerLink}>
        אין לך חשבון? <Link href="/register">הרשמה</Link>
      </p>
    </form>
  );
}
