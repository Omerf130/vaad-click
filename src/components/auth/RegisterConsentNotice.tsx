import Link from "next/link";

import { registrationConsentState } from "@/content/registration-consent";
import styles from "./RegisterConsentNotice.module.scss";

export function RegisterConsentNotice() {
  return (
    <aside className={styles.notice} aria-labelledby="register-consent-heading">
      <h2 id="register-consent-heading" className={styles.title}>
        מסמכים משפטיים
      </h2>
      <p className={styles.body}>{registrationConsentState.notice}</p>
      <p className={styles.links}>
        <Link href={registrationConsentState.privacyPath}>מדיניות פרטיות (טיוטה)</Link>
        {" · "}
        <Link href={registrationConsentState.termsPath}>תנאי שימוש (טיוטה)</Link>
      </p>
    </aside>
  );
}
