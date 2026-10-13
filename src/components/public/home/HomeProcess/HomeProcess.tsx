import { Container } from "@/components/ui";
import { homepageProcess } from "@/content/homepage";
import styles from "./HomeProcess.module.scss";

export function HomeProcess() {
  return (
    <section
      id="how-it-works"
      className={styles.section}
      aria-labelledby="process-heading"
    >
      <Container>
        <header className={styles.header}>
          <h2 id="process-heading" className={styles.title}>
            {homepageProcess.title}
          </h2>
          <p className={styles.intro}>{homepageProcess.intro}</p>
        </header>

        <ol className={styles.steps}>
          {homepageProcess.steps.map((step) => (
            <li key={step.number} className={styles.step}>
              <span className={styles.stepMarker} aria-hidden="true" />
              <span className={styles.number} aria-hidden="true">
                {step.number}
              </span>
              <div className={styles.stepContent}>
                <h3 className={styles.stepTitle}>{step.title}</h3>
                <p className={styles.stepBody}>{step.body}</p>
              </div>
            </li>
          ))}
        </ol>
      </Container>
    </section>
  );
}
