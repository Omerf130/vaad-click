import { homepageHero } from "@/content/homepage";
import styles from "./HeroIllustrativePreview.module.scss";

const illustrativeStatuses = [
  { label: "טיוטת מכתב", tone: "neutral" as const },
  { label: "ממתין לאישור עו״ד", tone: "warning" as const },
  { label: "במעקב", tone: "info" as const },
];

/** Static UI illustration — not connected to real data. */
export function HeroIllustrativePreview() {
  return (
    <aside className={styles.preview} aria-label={`${homepageHero.previewDisclaimer}`}>
      <p className={styles.disclaimer}>{homepageHero.previewDisclaimer}</p>
      <p className={styles.panelTitle}>סקירת תיק — בניין לדוגמה</p>
      <p className={styles.panelMeta}>דירה 12 · תיק לדוגמה</p>
      <ul className={styles.statusList}>
        {illustrativeStatuses.map((item) => (
          <li key={item.label} className={styles.statusRow}>
            <span className={[styles.statusDot, styles[item.tone]].join(" ")} />
            <span>{item.label}</span>
          </li>
        ))}
      </ul>
    </aside>
  );
}
