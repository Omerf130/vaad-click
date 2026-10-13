import Link from "next/link";
import { Container } from "@/components/ui";
import { homepageHeader } from "@/content/homepage";
import { PublicHeaderMenu } from "./PublicHeaderMenu";
import styles from "./PublicHeader.module.scss";

export function PublicHeader() {
  return (
    <header className={styles.header}>
      <Container className={styles.inner}>
        <Link href="/" className={styles.brand}>
          {homepageHeader.brand}
        </Link>
        <PublicHeaderMenu />
      </Container>
    </header>
  );
}
