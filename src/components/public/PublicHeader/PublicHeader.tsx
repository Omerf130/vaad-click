import Link from "next/link";
import { Container } from "@/components/ui";
import { Button } from "@/components/ui/Button/Button";
import { homepageHeader } from "@/content/homepage";
import styles from "./PublicHeader.module.scss";

export function PublicHeader() {
  return (
    <header className={styles.header}>
      <Container className={styles.inner}>
        <Link href="/" className={styles.brand}>
          {homepageHeader.brand}
        </Link>

        <nav className={styles.nav} aria-label="ניווט ראשי">
          <a href="#how-it-works" className={styles.navLink}>
            {homepageHeader.navHowItWorks}
          </a>
          <a href="#who-for" className={styles.navLink}>
            {homepageHeader.navWhoFor}
          </a>
        </nav>

        <div className={styles.actions}>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled
            title={homepageHeader.loginHint}
            aria-label={`${homepageHeader.loginLabel} — ${homepageHeader.loginHint}`}
          >
            {homepageHeader.loginLabel}
          </Button>
          <Button
            type="button"
            variant="primary"
            size="sm"
            disabled
            title={homepageHeader.registerHint}
            aria-label={`${homepageHeader.registerLabel} — ${homepageHeader.registerHint}`}
          >
            {homepageHeader.registerLabel}
          </Button>
        </div>
      </Container>
    </header>
  );
}
