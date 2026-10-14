import { LogoutButton } from "@/components/auth/LogoutButton";
import styles from "@/modules/admin/layout/AdminShell.module.scss";

export type AdminTopBarProps = {
  pageTitle: string;
  userFullName: string;
  userEmail: string;
};

export function AdminTopBar({ pageTitle, userFullName, userEmail }: AdminTopBarProps) {
  return (
    <header className={styles.topBar}>
      <div>
        <h1 className={styles.topBarTitle}>{pageTitle}</h1>
        <p className={styles.topBarMeta}>
          {userFullName} · {userEmail}
        </p>
      </div>
      <div className={styles.topBarActions}>
        <LogoutButton />
      </div>
    </header>
  );
}
