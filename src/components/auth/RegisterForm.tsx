"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { Button } from "@/components/ui/Button/Button";
import {
  registerAction,
  type AuthActionState,
} from "@/modules/auth/actions/auth.actions";
import { UserRole } from "@/modules/users/domain/user-role";
import fieldStyles from "./AuthFormFields.module.scss";

const initialState: AuthActionState = { ok: true };

export function RegisterForm() {
  const [state, formAction, pending] = useActionState(registerAction, initialState);
  const [confirmPassword, setConfirmPassword] = useState("");
  const [confirmError, setConfirmError] = useState<string | null>(null);

  return (
    <form
      action={formAction}
      className={fieldStyles.form}
      noValidate
      onSubmit={(event) => {
        const form = event.currentTarget;
        const password = (form.elements.namedItem("password") as HTMLInputElement)
          .value;
        if (password !== confirmPassword) {
          event.preventDefault();
          setConfirmError("הסיסמאות אינן תואמות");
          return;
        }
        setConfirmError(null);
      }}
    >
      <div className={fieldStyles.field}>
        <label className={fieldStyles.label} htmlFor="register-fullName">
          שם מלא
        </label>
        <input
          id="register-fullName"
          name="fullName"
          type="text"
          autoComplete="name"
          required
          className={fieldStyles.input}
        />
        {state.fieldErrors?.fullName ? (
          <p className={fieldStyles.fieldError}>{state.fieldErrors.fullName[0]}</p>
        ) : null}
      </div>

      <div className={fieldStyles.field}>
        <label className={fieldStyles.label} htmlFor="register-email">
          דוא&quot;ל
        </label>
        <input
          id="register-email"
          name="email"
          type="email"
          autoComplete="email"
          required
          className={fieldStyles.input}
        />
        {state.fieldErrors?.email ? (
          <p className={fieldStyles.fieldError}>{state.fieldErrors.email[0]}</p>
        ) : null}
      </div>

      <div className={fieldStyles.field}>
        <label className={fieldStyles.label} htmlFor="register-role">
          סוג חשבון
        </label>
        <select
          id="register-role"
          name="role"
          required
          defaultValue={UserRole.BUILDING_REP}
          className={fieldStyles.select}
        >
          <option value={UserRole.BUILDING_REP}>נציגות בית משותף</option>
          <option value={UserRole.MANAGEMENT_COMPANY}>חברת ניהול</option>
        </select>
        {state.fieldErrors?.role ? (
          <p className={fieldStyles.fieldError}>{state.fieldErrors.role[0]}</p>
        ) : null}
      </div>

      <div className={fieldStyles.field}>
        <label className={fieldStyles.label} htmlFor="register-password">
          סיסמה
        </label>
        <input
          id="register-password"
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
        <label className={fieldStyles.label} htmlFor="register-confirm">
          אימות סיסמה
        </label>
        <input
          id="register-confirm"
          name="confirmPassword"
          type="password"
          autoComplete="new-password"
          required
          value={confirmPassword}
          onChange={(event) => setConfirmPassword(event.target.value)}
          className={fieldStyles.input}
        />
        {confirmError ? <p className={fieldStyles.fieldError}>{confirmError}</p> : null}
      </div>

      {state.message && !state.ok ? (
        <p className={fieldStyles.formError} role="alert">
          {state.message}
        </p>
      ) : null}

      <div className={fieldStyles.actions}>
        <Button type="submit" variant="primary" disabled={pending}>
          {pending ? "נרשם…" : "יצירת חשבון"}
        </Button>
      </div>

      <p className={fieldStyles.footerLink}>
        כבר יש חשבון? <Link href="/login">כניסה</Link>
      </p>
    </form>
  );
}
