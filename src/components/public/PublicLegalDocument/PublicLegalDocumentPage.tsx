import type { ReactNode } from "react";

import { PublicFooter } from "@/components/public/PublicFooter/PublicFooter";
import { PublicHeader } from "@/components/public/PublicHeader/PublicHeader";
import { Container } from "@/components/ui";
import type { LegalDocumentDefinition } from "@/content/legal-pages";
import styles from "./PublicLegalDocumentPage.module.scss";

type Props = {
  document: LegalDocumentDefinition;
  children?: ReactNode;
};

export function PublicLegalDocumentPage({ document, children }: Props) {
  return (
    <div className={styles.page}>
      <a href="#legal-main" className="skipLink">
        דלג לתוכן הראשי
      </a>
      <PublicHeader />
      <main id="legal-main" className={styles.main}>
        <Container className={styles.container}>
          <article aria-labelledby="legal-doc-title">
            <header className={styles.docHeader}>
              <p className={styles.statusBadge} role="status">
                {document.draftNoticeTitle}
              </p>
              <h1 id="legal-doc-title" className={styles.title}>
                {document.title}
              </h1>
            </header>
            <div className={styles.body}>
              <p className={styles.draftLead}>{document.draftNoticeBody}</p>
              {children}
            </div>
          </article>
        </Container>
      </main>
      <PublicFooter />
    </div>
  );
}
