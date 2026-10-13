import { useId } from "react";
import { Button } from "@/components/ui/Button/Button";
import type { ButtonVariant } from "@/components/ui/Button/Button";
import styles from "./PlannedAction.module.scss";

type PlannedActionProps = {
  label: string;
  hint: string;
  variant?: ButtonVariant;
  hintClassName?: string;
};

/** Visually ready CTA for routes not yet implemented — not a broken link. */
export function PlannedAction({
  label,
  hint,
  variant = "primary",
  hintClassName,
}: PlannedActionProps) {
  const hintId = useId();

  return (
    <span className={styles.wrap}>
      <Button
        type="button"
        variant={variant}
        disabled
        title={hint}
        aria-describedby={hintId}
      >
        {label}
      </Button>
      <span
        id={hintId}
        className={[styles.hint, hintClassName].filter(Boolean).join(" ")}
      >
        {hint}
      </span>
    </span>
  );
}
