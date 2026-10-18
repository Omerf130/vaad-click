import type { ReactNode } from "react";

import { LogoutButton } from "@/components/auth/LogoutButton";
import { BackToPublicHomeLink } from "@/components/navigation/BackToPublicHomeLink";
import styles from "@/modules/admin/layout/AdminShell.module.scss";

export type AdminTopBarProps = {
  pageTitle: string;
  userFullName: string;
  userEmail: string;
  navToggle?: ReactNode;
  notificationBell?: ReactNode;
};

export function AdminTopBar({
  pageTitle,
  userFullName,
  userEmail,
  navToggle,
  notificationBell,
}: AdminTopBarProps) {
  return (
    <header className={styles.topBar}>
      <div>
        {navToggle}
        <h1 className={styles.topBarTitle}>{pageTitle}</h1>
        <p className={styles.topBarMeta}>
          {userFullName} · {userEmail}
        </p>
      </div>
      <div className={styles.topBarActions}>
        {notificationBell}
        <BackToPublicHomeLink />
        <LogoutButton />
      </div>
    </header>
  );
}
