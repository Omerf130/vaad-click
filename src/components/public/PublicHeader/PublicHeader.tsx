import Link from "next/link";

import { Container } from "@/components/ui";
import { homepageHeader } from "@/content/homepage";
import { getAuthenticatedContext } from "@/shared/auth/get-authenticated-context";
import { resolvePublicHeaderNavActions } from "@/shared/navigation/public-header-auth-nav";
import { PublicHeaderMenu } from "./PublicHeaderMenu";
import styles from "./PublicHeader.module.scss";

export async function PublicHeader() {
  const context = await getAuthenticatedContext();
  const authActions = resolvePublicHeaderNavActions(context);

  return (
    <header className={styles.header}>
      <Container className={styles.inner}>
        <Link href="/" className={styles.brand}>
          {homepageHeader.brand}
        </Link>
        <PublicHeaderMenu authActions={authActions} />
      </Container>
    </header>
  );
}
