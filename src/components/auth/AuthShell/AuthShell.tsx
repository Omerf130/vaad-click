import Link from "next/link";
import { Container } from "@/components/ui";
import { homepageHeader } from "@/content/homepage";
import styles from "./AuthShell.module.scss";

type AuthShellProps = {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
};

export function AuthShell({ title, subtitle, children }: AuthShellProps) {
  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <Container className={styles.headerInner}>
          <Link href="/" className={styles.brand}>
            {homepageHeader.brand}
          </Link>
        </Container>
      </header>
      <main className={styles.main}>
        <Container className={styles.container}>
          <div className={styles.card}>
            <h1 className={styles.title}>{title}</h1>
            {subtitle ? <p className={styles.subtitle}>{subtitle}</p> : null}
            {children}
          </div>
        </Container>
      </main>
    </div>
  );
}
