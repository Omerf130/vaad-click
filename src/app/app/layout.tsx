import { Container } from "@/components/ui";
import { LogoutButton } from "@/components/auth/LogoutButton";
import { requireDevelopmentPortalAccess } from "@/shared/auth/require-access";
import styles from "./app-shell.module.scss";

export default async function AppShellLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireDevelopmentPortalAccess();

  return (
    <div className={styles.shell}>
      <header className={styles.header}>
        <Container className={styles.headerInner}>
          <span className={styles.brand}>ועד בקליק — אזור מחובר</span>
          <LogoutButton />
        </Container>
      </header>
      <main className={styles.main}>{children}</main>
    </div>
  );
}
