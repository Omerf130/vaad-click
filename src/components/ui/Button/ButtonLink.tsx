import type { AnchorHTMLAttributes, ReactNode } from "react";
import styles from "./Button.module.scss";
import type { ButtonSize, ButtonVariant } from "./Button";

export type ButtonLinkProps = AnchorHTMLAttributes<HTMLAnchorElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  children: ReactNode;
};

export function ButtonLink({
  variant = "primary",
  size = "md",
  className,
  children,
  ...rest
}: ButtonLinkProps) {
  return (
    <a
      className={[styles.button, styles[variant], styles[size], className]
        .filter(Boolean)
        .join(" ")}
      {...rest}
    >
      {children}
    </a>
  );
}
