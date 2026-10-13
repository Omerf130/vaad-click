import { Container } from "@/components/ui";
import { PlannedAction } from "@/components/public/PlannedAction/PlannedAction";
import { homepageFinalCta } from "@/content/homepage";
import styles from "./HomeFinalCta.module.scss";

export function HomeFinalCta() {
  return (
    <section className={styles.section} aria-labelledby="final-cta-heading">
      <Container className={styles.inner}>
        <span className={styles.accentBar} aria-hidden="true" />
        <h2 id="final-cta-heading" className={styles.title}>
          {homepageFinalCta.title}
        </h2>
        <p className={styles.body}>{homepageFinalCta.body}</p>
        <div className={styles.ctaWrap}>
          <PlannedAction
            label={homepageFinalCta.buttonLabel}
            hint={homepageFinalCta.buttonHint}
            variant="accent"
            hintClassName={styles.hintOnDark}
          />
        </div>
      </Container>
    </section>
  );
}
