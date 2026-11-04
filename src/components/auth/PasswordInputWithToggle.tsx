"use client";

import { useId, useState } from "react";

import fieldStyles from "@/components/auth/AuthFormFields.module.scss";
import styles from "@/components/auth/PasswordInputWithToggle.module.scss";

type PasswordInputWithToggleProps = {
  id: string;
  name: string;
  label: string;
  autoComplete: "new-password" | "current-password";
  required?: boolean;
  value?: string;
  onChange?: (event: React.ChangeEvent<HTMLInputElement>) => void;
  errorMessage?: string;
};

function EyeIcon() {
  return (
    <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none">
      <path
        d="M2.5 12C4.5 7.5 8 5 12 5s7.5 2.5 9.5 7c-2 4.5-5.5 7-9.5 7s-7.5-2.5-9.5-7Z"
        stroke="currentColor"
        strokeWidth="1.75"
      />
      <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.75" />
    </svg>
  );
}

function EyeOffIcon() {
  return (
    <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none">
      <path
        d="M3 3 21 21M10.5 10.7a2.5 2.5 0 0 0 3.5 3.5M7.2 7.4C5.4 8.8 3.9 10.7 2.5 12c2 4.5 5.5 7 9.5 7 1.6 0 3.1-.4 4.4-1.1M9.9 5.3A10.8 10.8 0 0 1 12 5c4 0 7.5 2.5 9.5 7-.7 1.6-1.7 3-2.9 4.2"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function PasswordInputWithToggle({
  id,
  name,
  label,
  autoComplete,
  required = false,
  value,
  onChange,
  errorMessage,
}: PasswordInputWithToggleProps) {
  const [visible, setVisible] = useState(false);
  const errorId = useId();
  const describedBy = errorMessage ? errorId : undefined;

  return (
    <div className={fieldStyles.field}>
      <label className={fieldStyles.label} htmlFor={id}>
        {label}
      </label>
      <div className={styles.inputWrap}>
        <input
          id={id}
          name={name}
          type={visible ? "text" : "password"}
          autoComplete={autoComplete}
          required={required}
          value={value}
          onChange={onChange}
          className={`${fieldStyles.input} ${styles.inputWithToggle}`}
          aria-describedby={describedBy}
        />
        <button
          type="button"
          className={styles.toggleButton}
          onClick={() => setVisible((current) => !current)}
          aria-label={visible ? "הסתר סיסמה" : "הצג סיסמה"}
          aria-pressed={visible}
        >
          {visible ? <EyeOffIcon /> : <EyeIcon />}
        </button>
      </div>
      {errorMessage ? (
        <p id={errorId} className={fieldStyles.fieldError}>
          {errorMessage}
        </p>
      ) : null}
    </div>
  );
}
