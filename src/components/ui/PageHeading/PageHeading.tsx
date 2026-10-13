import type { ReactNode } from "react";
import styles from "./PageHeading.module.scss";

export type PageHeadingProps = {
  title: string;
  subtitle?: string;
  eyebrow?: string;
  actions?: ReactNode;
};

export function PageHeading({ title, subtitle, eyebrow, actions }: PageHeadingProps) {
  return (
    <header className={styles.root}>
      <div className={styles.text}>
        {eyebrow && <p className={styles.eyebrow}>{eyebrow}</p>}
        <h1 className={styles.title}>{title}</h1>
        {subtitle && <p className={styles.subtitle}>{subtitle}</p>}
      </div>
      {actions && <div className={styles.actions}>{actions}</div>}
    </header>
  );
}
