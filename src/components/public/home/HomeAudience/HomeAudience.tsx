import { Container } from "@/components/ui";
import { homepageAudience } from "@/content/homepage";
import styles from "./HomeAudience.module.scss";

export function HomeAudience() {
  return (
    <section id="who-for" className={styles.section} aria-labelledby="audience-heading">
      <Container>
        <header className={styles.header}>
          <span className={styles.kicker}>קהלי יעד</span>
          <h2 id="audience-heading" className={styles.title}>
            {homepageAudience.title}
          </h2>
          <p className={styles.intro}>{homepageAudience.intro}</p>
        </header>

        <div className={styles.editorial}>
          <article className={[styles.block, styles.committees].join(" ")}>
            <span className={styles.index} aria-hidden="true">
              01
            </span>
            <h3 className={styles.blockTitle}>{homepageAudience.committees.title}</h3>
            <p className={styles.blockBody}>{homepageAudience.committees.body}</p>
          </article>

          <article className={[styles.block, styles.management].join(" ")}>
            <span className={styles.index} aria-hidden="true">
              02
            </span>
            <h3 className={styles.blockTitle}>{homepageAudience.management.title}</h3>
            <p className={styles.blockBody}>{homepageAudience.management.body}</p>
          </article>
        </div>
      </Container>
    </section>
  );
}
