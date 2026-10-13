import { Container } from "@/components/ui";
import { homepageFooter, homepageHeader } from "@/content/homepage";
import styles from "./PublicFooter.module.scss";

export function PublicFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className={styles.footer}>
      <Container className={styles.inner}>
        <div className={styles.columns}>
          <div className={styles.brandBlock}>
            <p className={styles.brand}>{homepageFooter.brand}</p>
            <p className={styles.description}>{homepageFooter.description}</p>
          </div>

          <nav className={styles.nav} aria-label="ניווט תחתון">
            <p className={styles.navTitle}>בדף זה</p>
            <a href="#how-it-works" className={styles.navLink}>
              {homepageHeader.navHowItWorks}
            </a>
            <a href="#who-for" className={styles.navLink}>
              {homepageHeader.navWhoFor}
            </a>
          </nav>
        </div>

        <p className={styles.copy}>
          © {year} {homepageFooter.brand}. {homepageFooter.copyright}
        </p>
      </Container>
    </footer>
  );
}
