import styles from "./LegalConfirmedClauseSnippet.module.scss";

type Props = {
  sectionNumber: string;
  title?: string;
  text: string;
};

/** Displays counsel-approved replacement text for a single clause (not the full document). */
export function LegalConfirmedClauseSnippet({ sectionNumber, title, text }: Props) {
  const heading = title ? `סעיף ${sectionNumber} — ${title}` : `סעיף ${sectionNumber}`;

  return (
    <section
      className={styles.snippet}
      aria-labelledby={`legal-confirmed-clause-${sectionNumber}`}
    >
      <h2 id={`legal-confirmed-clause-${sectionNumber}`} className={styles.heading}>
        {heading}
      </h2>
      <p className={styles.note}>
        נוסח מאושר להחלפת מציין מקום — יש לשלב בסעיף המלא בגוף תנאי השימוש לאחר ייבוא
        העורך דין.
      </p>
      <p className={styles.text}>{text}</p>
    </section>
  );
}
