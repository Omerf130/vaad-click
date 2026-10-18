"use client";

import { usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";

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
  const [navExpanded, setNavExpanded] = useState(false);

  return (
    <div className={styles.shell}>
      <div className={styles.mainColumn}>
        <AdminTopBar
          pageTitle={pageTitle}
          userFullName={userFullName}
          userEmail={userEmail}
          navToggle={
            <AdminNavToggle expanded={navExpanded} onToggle={() => setNavExpanded((open) => !open)} />
          }
          notificationBell={
            <NotificationBell
              initialUnreadCount={initialUnreadNotifications}
              fullListHref="/app/admin/notifications"
            />
          }
        />
        <main className={styles.workspace}>{children}</main>
      </div>
      <AdminSidebar expanded={navExpanded} onNavigate={() => setNavExpanded(false)} />
    </div>
  );
}
