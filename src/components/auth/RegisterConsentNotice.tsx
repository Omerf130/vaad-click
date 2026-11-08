import Link from "next/link";

import { legalDocumentLinkLabel } from "@/content/legal/legal-document-display";
import { legalDocuments } from "@/content/legal-pages";
import { registrationConsentState } from "@/content/registration-consent";
import styles from "./RegisterConsentNotice.module.scss";

export function RegisterConsentNotice() {
  const privacyLabel = legalDocumentLinkLabel(legalDocuments.privacy);
  const termsLabel = legalDocumentLinkLabel(legalDocuments.terms);

  return (
    <aside className={styles.notice} aria-labelledby="register-consent-heading">
      <h2 id="register-consent-heading" className={styles.title}>
        מסמכים משפטיים
      </h2>
      <p className={styles.body}>{registrationConsentState.notice}</p>
      <p className={styles.links}>
        <Link href={registrationConsentState.privacyPath}>{privacyLabel}</Link>
        {" · "}
        <Link href={registrationConsentState.termsPath}>{termsLabel}</Link>
      </p>
    </aside>
  );
}
