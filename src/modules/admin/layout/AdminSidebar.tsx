"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { forwardRef } from "react";

import {
  getImplementedAdminNavItems,
  getPlannedAdminNavItems,
  isAdminNavItemActive,
} from "@/modules/admin/navigation/admin-nav-config";
import styles from "@/modules/admin/layout/AdminShell.module.scss";

type Props = {
  mobileOpen: boolean;
  onNavigate?: () => void;
};

export const AdminSidebar = forwardRef<HTMLElement, Props>(function AdminSidebar(
  { mobileOpen, onNavigate },
  ref,
) {
  const pathname = usePathname();
  const implemented = getImplementedAdminNavItems();
  const planned = getPlannedAdminNavItems();

  const sidebarClass = [
    styles.sidebar,
    mobileOpen ? styles.sidebarMobileOpen : styles.sidebarMobileClosed,
  ].join(" ");

  return (
    <aside
      ref={ref}
      id="admin-mobile-nav-drawer"
      className={sidebarClass}
      aria-label="ניווט מנהל משרד"
    >
      <div className={styles.brandBlock}>
        <p className={styles.brandTitle}>ועד בקליק</p>
        <p className={styles.brandSubtitle}>ניהול משרד</p>
      </div>
      <nav id="admin-sidebar-nav" aria-label="יעדים פעילים">
        <ul className={styles.navList}>
          {implemented.map((item) => {
            const active = isAdminNavItemActive(pathname, item);
            return (
              <li key={item.id}>
                <Link
                  href={item.href!}
                  className={active ? styles.navLinkActive : styles.navLink}
                  aria-current={active ? "page" : undefined}
                  onClick={onNavigate}
                >
                  {item.labelHe}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
      {planned.length > 0 ? (
        <div className={styles.plannedNavBlock} aria-label="מודולים עתידיים">
          <p className={styles.plannedNavHeading}>בקרוב</p>
          <ul className={styles.plannedNavList}>
            {planned.map((item) => (
              <li key={item.id} className={styles.plannedNavItem} title={item.unavailableReasonHe}>
                {item.labelHe}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </aside>
  );
});
