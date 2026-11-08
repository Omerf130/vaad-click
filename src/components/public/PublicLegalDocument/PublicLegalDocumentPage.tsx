import type { ReactNode } from "react";

import { PublicFooter } from "@/components/public/PublicFooter/PublicFooter";
import { PublicHeader } from "@/components/public/PublicHeader/PublicHeader";
import { Container } from "@/components/ui";
import type { LegalDocumentDefinition } from "@/content/legal-pages";
import { LEGAL_OFFICIAL_DOCUMENT_DATE_DISPLAY } from "@/content/legal/legal-publication-config";
import styles from "./PublicLegalDocumentPage.module.scss";

type Props = {
  document: LegalDocumentDefinition;
  children?: ReactNode;
  /** Full document heading from counsel (may differ from nav title). */
  documentHeading?: string;
};

export function PublicLegalDocumentPage({
  document,
  children,
  documentHeading,
}: Props) {
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
              {document.showDraftChrome ? (
                <p className={styles.statusBadge} role="status">
                  {document.draftNoticeTitle}
                </p>
              ) : null}
              <h1 id="legal-doc-title" className={styles.title}>
                {documentHeading ?? document.title}
              </h1>
              {!document.showDraftChrome ? (
                <p className={styles.meta}>
                  <span className={styles.metaLabel}>תאריך מסמך: </span>
                  <time dateTime="2026-11-06">{LEGAL_OFFICIAL_DOCUMENT_DATE_DISPLAY}</time>
                </p>
              ) : null}
            </header>
            <div className={styles.body}>
              {document.showDraftChrome ? (
                <p className={styles.draftLead}>{document.draftNoticeBody}</p>
              ) : null}
              {children}
            </div>
          </article>
        </Container>
      </main>
      <PublicFooter />
    </div>
  );
}
