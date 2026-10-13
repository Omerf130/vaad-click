import type { HTMLAttributes, ReactNode } from "react";
import styles from "./Container.module.scss";

type ContainerWidth = "default" | "narrow" | "full";

export type ContainerProps = HTMLAttributes<HTMLDivElement> & {
  width?: ContainerWidth;
  children: ReactNode;
};

export function Container({
  width = "default",
  children,
  className,
  ...rest
}: ContainerProps) {
  const widthClass =
    width === "narrow"
      ? styles.narrow
      : width === "full"
        ? styles.full
        : styles.default;

  return (
    <div
      className={[styles.root, widthClass, className].filter(Boolean).join(" ")}
      {...rest}
    >
      {children}
    </div>
  );
}
