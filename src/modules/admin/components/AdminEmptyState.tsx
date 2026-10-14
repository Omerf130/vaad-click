import type { ReactNode } from "react";

import styles from "@/modules/admin/components/AdminEmptyState.module.scss";

export type AdminEmptyStateProps = {
  title: string;
  description: string;
  actions?: ReactNode;
};

export function AdminEmptyState({ title, description, actions }: AdminEmptyStateProps) {
  return (
    <div className={styles.root}>
      <h2 className={styles.title}>{title}</h2>
      <p className={styles.description}>{description}</p>
      {actions ? <div className={styles.actions}>{actions}</div> : null}
    </div>
  );
}
