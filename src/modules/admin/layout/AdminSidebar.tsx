"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import {
  ADMIN_NAV_ITEMS,
  isAdminNavItemActive,
} from "@/modules/admin/navigation/admin-nav-config";
import styles from "@/modules/admin/layout/AdminShell.module.scss";

type Props = {
  expanded?: boolean;
  onNavigate?: () => void;
};

export function AdminSidebar({ expanded = true, onNavigate }: Props) {
  const pathname = usePathname();
  const sidebarClass = [styles.sidebar, expanded ? "" : styles.sidebarCollapsed]
    .filter(Boolean)
    .join(" ");

  return (
    <aside className={sidebarClass} aria-label="ניווט מנהל משרד">
      <div className={styles.brandBlock}>
        <p className={styles.brandTitle}>ועד בקליק</p>
        <p className={styles.brandSubtitle}>ניהול משרד</p>
      </div>
      <nav id="admin-sidebar-nav">
        <ul className={styles.navList}>
          {ADMIN_NAV_ITEMS.map((item) => {
            const active = isAdminNavItemActive(pathname, item);
            if (item.status === "implemented" && item.href) {
              return (
                <li key={item.id}>
                  <Link
                    href={item.href}
                    className={active ? styles.navLinkActive : styles.navLink}
                    aria-current={active ? "page" : undefined}
                    onClick={onNavigate}
                  >
                    {item.labelHe}
                  </Link>
                </li>
              );
            }
            return (
              <li key={item.id}>
                <span
                  className={styles.navLinkDisabled}
                  title={item.unavailableReasonHe}
                  aria-disabled="true"
                >
                  {item.labelHe}
                </span>
              </li>
            );
          })}
        </ul>
      </nav>
    </aside>
  );
}
