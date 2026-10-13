import styles from "./StatusBadge.module.scss";

export type StatusBadgeVariant = "success" | "warning" | "error" | "info" | "neutral";

export type StatusBadgeProps = {
  label: string;
  variant?: StatusBadgeVariant;
};

export function StatusBadge({ label, variant = "neutral" }: StatusBadgeProps) {
  return (
    <span className={[styles.badge, styles[variant]].join(" ")}>
      <span className={styles.dot} aria-hidden="true" />
      {label}
    </span>
  );
}
