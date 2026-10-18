"use client";

import styles from "@/modules/admin/layout/AdminShell.module.scss";

type Props = {
  expanded: boolean;
  onToggle: () => void;
};

export function AdminNavToggle({ expanded, onToggle }: Props) {
  return (
    <button
      type="button"
      className={styles.navToggle}
      onClick={onToggle}
      aria-expanded={expanded}
      aria-controls="admin-sidebar-nav"
    >
      {expanded ? "סגירת תפריט" : "תפריט ניווט"}
    </button>
  );
}
