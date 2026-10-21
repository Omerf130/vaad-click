"use client";

import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";

import { AdminNavToggle } from "@/modules/admin/layout/AdminNavToggle";
import { AdminSidebar } from "@/modules/admin/layout/AdminSidebar";
import { AdminTopBar } from "@/modules/admin/layout/AdminTopBar";
import { NotificationBell } from "@/modules/notifications/ui/NotificationBell";
import { resolveAdminTopBarTitle } from "@/modules/admin/layout/admin-page-titles";
import styles from "@/modules/admin/layout/AdminShell.module.scss";

export type AdminShellProps = {
  userFullName: string;
  userEmail: string;
  initialUnreadNotifications: number;
  children: ReactNode;
};

export function AdminShell({
  userFullName,
  userEmail,
  initialUnreadNotifications,
  children,
}: AdminShellProps) {
  const pathname = usePathname();
  const pageTitle = resolveAdminTopBarTitle(pathname);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const navToggleRef = useRef<HTMLButtonElement>(null);
  const sidebarRef = useRef<HTMLElement>(null);

  const closeMobileNav = useCallback(() => {
    setMobileNavOpen(false);
    navToggleRef.current?.focus();
  }, []);

  useEffect(() => {
    queueMicrotask(() => setMobileNavOpen(false));
  }, [pathname]);

  useEffect(() => {
    if (!mobileNavOpen) {
      return;
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        closeMobileNav();
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [mobileNavOpen, closeMobileNav]);

  useEffect(() => {
    if (!mobileNavOpen) {
      return;
    }
    const firstFocusable = sidebarRef.current?.querySelector<HTMLElement>(
      'a[href], button:not([disabled])',
    );
    firstFocusable?.focus();
  }, [mobileNavOpen]);

  useEffect(() => {
    if (!mobileNavOpen || !sidebarRef.current) {
      return;
    }
    const root = sidebarRef.current;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== "Tab") {
        return;
      }
      const focusables = Array.from(
        root.querySelectorAll<HTMLElement>('a[href], button:not([disabled])'),
      ).filter((el) => !el.hasAttribute("disabled") && el.tabIndex !== -1);
      if (focusables.length === 0) {
        return;
      }
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [mobileNavOpen]);

  const mainColumnClass = mobileNavOpen
    ? `${styles.mainColumn} ${styles.mainColumnInert}`
    : styles.mainColumn;

  return (
    <div className={mobileNavOpen ? `${styles.shell} ${styles.shellMobileNavOpen}` : styles.shell}>
      {mobileNavOpen ? (
        <button
          type="button"
          className={styles.drawerBackdrop}
          aria-label="סגירת תפריט ניווט"
          onClick={closeMobileNav}
        />
      ) : null}
      <div className={mainColumnClass} inert={mobileNavOpen ? true : undefined}>
        <AdminTopBar
          pageTitle={pageTitle}
          userFullName={userFullName}
          userEmail={userEmail}
          navToggle={
            <AdminNavToggle
              ref={navToggleRef}
              expanded={mobileNavOpen}
              onToggle={() => setMobileNavOpen((open) => !open)}
            />
          }
          notificationBell={
            <NotificationBell
              initialUnreadCount={initialUnreadNotifications}
              fullListHref="/app/admin/notifications"
            />
          }
        />
        <main className={styles.workspace} id="admin-main-content">
          {children}
        </main>
      </div>
      <AdminSidebar
        ref={sidebarRef}
        mobileOpen={mobileNavOpen}
        onNavigate={closeMobileNav}
      />
    </div>
  );
}
