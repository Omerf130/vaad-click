"use client";

import { forwardRef } from "react";

import styles from "@/modules/admin/layout/AdminShell.module.scss";

type Props = {
  expanded: boolean;
  onToggle: () => void;
};

export const AdminNavToggle = forwardRef<HTMLButtonElement, Props>(function AdminNavToggle(
  { expanded, onToggle },
  ref,
) {
  return (
    <button
      ref={ref}
      type="button"
      className={styles.navToggle}
      onClick={onToggle}
      aria-expanded={expanded}
      aria-controls="admin-mobile-nav-drawer"
    >
      {expanded ? "סגירת תפריט" : "תפריט ניווט"}
    </button>
  );
});
