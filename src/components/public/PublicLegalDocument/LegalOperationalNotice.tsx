import styles from "./LegalOperationalNotice.module.scss";

type Props = {
  title: string;
  body: string;
};

export function LegalOperationalNotice({ title, body }: Props) {
  return (
    <aside className={styles.notice} aria-labelledby="legal-operational-notice-title">
      <h2 id="legal-operational-notice-title" className={styles.title}>
        {title}
      </h2>
      <p className={styles.body}>{body}</p>
    </aside>
  );
}
