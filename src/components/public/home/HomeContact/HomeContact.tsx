import { Container } from "@/components/ui";
import { homepageContact } from "@/content/homepage";
import {
  lawFirmBranchTelHref,
  lawFirmIdentity,
  lawFirmMailtoHref,
} from "@/content/law-firm";
import styles from "./HomeContact.module.scss";

export function HomeContact() {
  return (
    <section
      id="contact"
      className={styles.section}
      aria-labelledby="contact-heading"
    >
      <Container>
        <header className={styles.header}>
          <h2 id="contact-heading" className={styles.title}>
            {homepageContact.title}
          </h2>
          <p className={styles.intro}>{homepageContact.intro}</p>
        </header>

        <div className={styles.grid}>
          {lawFirmIdentity.branches.map((branch) => (
            <article key={branch.id} className={styles.branchCard}>
              <h3 className={styles.branchName}>{branch.branchName}</h3>
              <address className={styles.address}>
                <span className={styles.addressLine}>{branch.address}</span>
                <a className={styles.phoneLink} href={lawFirmBranchTelHref(branch)}>
                  {branch.phoneDisplay}
                </a>
              </address>
            </article>
          ))}

          <aside className={styles.metaCard} aria-label="פרטי קשר כלליים">
            <p className={styles.lawyerName}>{lawFirmIdentity.lawyerDisplayName}</p>
            <p className={styles.serviceContext}>{lawFirmIdentity.serviceContext}</p>
            <dl className={styles.metaList}>
              <div className={styles.metaRow}>
                <dt>דוא&quot;ל</dt>
                <dd>
                  <a href={lawFirmMailtoHref()}>{lawFirmIdentity.email}</a>
                </dd>
              </div>
              <div className={styles.metaRow}>
                <dt>{lawFirmIdentity.businessHours.label}</dt>
                <dd>{lawFirmIdentity.businessHours.schedule}</dd>
              </div>
            </dl>
          </aside>
        </div>
      </Container>
    </section>
  );
}
