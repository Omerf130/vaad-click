import type { ReactNode } from "react";

import { StatusBadge } from "@/components/ui/StatusBadge/StatusBadge";
import styles from "@/modules/admin/components/AdminModuleCard.module.scss";

export type AdminModuleCardProps = {
  title: string;
  description: string;
  footer?: ReactNode;
  unavailable?: boolean;
  badgeLabel?: string;
};

export function AdminModuleCard({
  title,
  description,
  footer,
  unavailable = false,
  badgeLabel,
}: AdminModuleCardProps) {
  return (
    <article
      className={[styles.card, unavailable ? styles.cardDisabled : ""].filter(Boolean).join(" ")}
    >
      <div className={styles.titleRow}>
        <h2 className={styles.title}>{title}</h2>
        {badgeLabel ? <StatusBadge label={badgeLabel} variant="neutral" /> : null}
        {unavailable ? <StatusBadge label="בקרוב" variant="info" /> : null}
      </div>
      <p className={styles.description}>{description}</p>
      {footer ? <div className={styles.footer}>{footer}</div> : null}
    </article>
  );
}
