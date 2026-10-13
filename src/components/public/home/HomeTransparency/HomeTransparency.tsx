import { Container } from "@/components/ui";
import { homepageTransparency } from "@/content/homepage";
import styles from "./HomeTransparency.module.scss";

const timelineLabels = ["מעקב", "אישור", "אחריות"];

export function HomeTransparency() {
  return (
    <section className={styles.section} aria-labelledby="transparency-heading">
      <Container className={styles.layout}>
        <div className={styles.introBlock}>
          <span className={styles.kicker}>שקיפות ופיקוח</span>
          <h2 id="transparency-heading" className={styles.title}>
            {homepageTransparency.title}
          </h2>
        </div>

        <div className={styles.panel} role="list" aria-label="עקרונות שקיפות">
          {homepageTransparency.paragraphs.map((paragraph, index) => (
            <article key={index} className={styles.timelineItem} role="listitem">
              <div className={styles.timelineRail} aria-hidden="true">
                <span className={styles.timelineDot} />
                {index < homepageTransparency.paragraphs.length - 1 && (
                  <span className={styles.timelineLine} />
                )}
              </div>
              <div className={styles.timelineBody}>
                <p className={styles.timelineLabel}>{timelineLabels[index]}</p>
                <p className={styles.paragraph}>{paragraph}</p>
              </div>
            </article>
          ))}
        </div>
      </Container>
    </section>
  );
}
