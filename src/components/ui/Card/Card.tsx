import type { HTMLAttributes, ReactNode } from "react";
import styles from "./Card.module.scss";

export type CardProps = HTMLAttributes<HTMLElement> & {
  title?: string;
  description?: string;
  children?: ReactNode;
  padding?: "md" | "lg";
};

export function Card({
  title,
  description,
  children,
  padding = "md",
  className,
  ...rest
}: CardProps) {
  return (
    <section
      className={[styles.card, styles[padding], className].filter(Boolean).join(" ")}
      {...rest}
    >
      {(title || description) && (
        <header className={styles.header}>
          {title && <h3 className={styles.title}>{title}</h3>}
          {description && <p className={styles.description}>{description}</p>}
        </header>
      )}
      {children && <div className={styles.body}>{children}</div>}
    </section>
  );
}
