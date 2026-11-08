import { verifiedSiteAccessibilityAdaptations } from "@/content/legal/verified-site-accessibility";
import styles from "./VerifiedSiteAccessibilityPanel.module.scss";

export function VerifiedSiteAccessibilityPanel() {
  return (
    <section
      className={styles.panel}
      aria-labelledby="verified-a11y-adaptations-heading"
    >
      <h2 id="verified-a11y-adaptations-heading" className={styles.title}>
        התאמות שאומתו טכנית במערכת (לא הצהרת עמידה בתקן)
      </h2>
      <p className={styles.lead}>
        רשימה זו מתארת מאפיינים שנבדקו בקוד ובדפדפן בשלב הפיתוח. אינה מחליפה
        בדיקת נגישות חיצונית או את נוסח הצהרת הנגישות המאושרת.
      </p>
      <ul className={styles.list}>
        {verifiedSiteAccessibilityAdaptations.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </section>
  );
}
