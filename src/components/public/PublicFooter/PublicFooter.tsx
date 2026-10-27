import Link from "next/link";

import { Container } from "@/components/ui";
import { homepageFooter, homepageHeader } from "@/content/homepage";
import { legalDocumentList } from "@/content/legal-pages";
import {
  lawFirmBranchTelHref,
  lawFirmIdentity,
  lawFirmMailtoHref,
} from "@/content/law-firm";
import styles from "./PublicFooter.module.scss";

export function PublicFooter() {
  const year = new Date().getFullYear();
  const primaryBranch = lawFirmIdentity.branches[0];

  return (
    <footer className={styles.footer}>
      <Container className={styles.inner}>
        <div className={styles.columns}>
          <div className={styles.brandBlock}>
            <p className={styles.brand}>{homepageFooter.brand}</p>
            <p className={styles.operator}>{homepageFooter.operatorLine}</p>
            <p className={styles.description}>{homepageFooter.description}</p>
            <p className={styles.contactCompact}>
              <a href={lawFirmMailtoHref()}>{lawFirmIdentity.email}</a>
              {" · "}
              <a href={lawFirmBranchTelHref(primaryBranch)}>
                {primaryBranch.phoneDisplay}
              </a>
              {" · "}
              <Link href="/#contact">כל הסניפים</Link>
            </p>
          </div>

          <nav className={styles.nav} aria-label="ניווט תחתון">
            <p className={styles.navTitle}>בדף זה</p>
            <a href="#how-it-works" className={styles.navLink}>
              {homepageHeader.navHowItWorks}
            </a>
            <a href="#who-for" className={styles.navLink}>
              {homepageHeader.navWhoFor}
            </a>
            <a href="#contact" className={styles.navLink}>
              {homepageHeader.navContact}
            </a>
          </nav>

          <nav className={styles.nav} aria-label="מסמכים משפטיים">
            <p className={styles.navTitle}>מסמכים</p>
            {legalDocumentList.map((doc) => (
              <Link key={doc.path} href={doc.path} className={styles.navLink}>
                {doc.title}
              </Link>
            ))}
          </nav>
        </div>

        <p className={styles.copy}>
          © {year} {homepageFooter.brand} · {lawFirmIdentity.lawyerDisplayName}.{" "}
          {homepageFooter.copyright}
        </p>
      </Container>
    </footer>
  );
}
