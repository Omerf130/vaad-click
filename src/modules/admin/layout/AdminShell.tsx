"use client";

import { usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";

import { AdminNavToggle } from "@/modules/admin/layout/AdminNavToggle";
import { AdminSidebar } from "@/modules/admin/layout/AdminSidebar";
import { AdminTopBar } from "@/modules/admin/layout/AdminTopBar";
import { resolveAdminTopBarTitle } from "@/modules/admin/layout/admin-page-titles";
import styles from "@/modules/admin/layout/AdminShell.module.scss";

export type AdminShellProps = {
  userFullName: string;
  userEmail: string;
  children: ReactNode;
};

export function AdminShell({ userFullName, userEmail, children }: AdminShellProps) {
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
        />
        <main className={styles.workspace}>{children}</main>
      </div>
      <AdminSidebar expanded={navExpanded} onNavigate={() => setNavExpanded(false)} />
    </div>
  );
}
