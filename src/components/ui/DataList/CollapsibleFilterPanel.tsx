"use client";

import Link from "next/link";
import { useId, useState, type FormEventHandler, type ReactNode } from "react";

import styles from "@/components/ui/DataList/DataList.module.scss";

type Props = {
  title?: string;
  activeFilterCount?: number;
  resetHref?: string;
  onSubmit?: FormEventHandler<HTMLFormElement>;
  method?: "get" | "post";
  action?: string;
  primary: ReactNode;
  secondary?: ReactNode;
  actions?: ReactNode;
  hiddenFields?: ReactNode;
};

export function CollapsibleFilterPanel({
  title = "סינון וחיפוש",
  activeFilterCount = 0,
  resetHref,
  onSubmit,
  method = "get",
  action,
  primary,
  secondary,
  actions,
  hiddenFields,
}: Props) {
  const [expanded, setExpanded] = useState(false);
  const secondaryId = useId();
  const hasSecondary = Boolean(secondary);
  const secondaryClass = expanded
    ? `${styles.filterSecondary} ${styles.filterSecondaryOpen}`
    : styles.filterSecondary;

  return (
    <section className={styles.filterPanel} aria-label={title}>
      <div className={styles.filterPanelHeader}>
        <h2 className={styles.filterPanelTitle}>{title}</h2>
        <div className={styles.filterActions}>
          {activeFilterCount > 0 ? (
            <span className={styles.filterActiveBadge}>{activeFilterCount} מסננים פעילים</span>
          ) : null}
          {resetHref ? (
            <Link href={resetHref} className={styles.filterResetLink}>
              איפוס
            </Link>
          ) : null}
          {hasSecondary ? (
            <button
              type="button"
              className={styles.filterToggle}
              aria-expanded={expanded}
              aria-controls={secondaryId}
              onClick={() => setExpanded((open) => !open)}
            >
              {expanded ? "הסתר מסננים נוספים" : "מסננים נוספים"}
            </button>
          ) : null}
        </div>
      </div>
      <form
        className={styles.filterBody}
        method={method}
        action={action}
        onSubmit={onSubmit}
      >
        {hiddenFields}
        <div className={styles.filterPrimary}>{primary}</div>
        {hasSecondary ? (
          <div id={secondaryId} className={secondaryClass}>
            {secondary}
          </div>
        ) : null}
        {actions ? <div className={`${styles.filterActions} ${styles.filterSubmitRow}`}>{actions}</div> : null}
      </form>
    </section>
  );
}
