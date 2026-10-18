import Link from "next/link";

import styles from "@/modules/admin/components/AdminPageFrame.module.scss";

export type AdminBreadcrumbItem = {
  label: string;
  href?: string;
};

type Props = {
  items: AdminBreadcrumbItem[];
};

export function AdminBreadcrumbs({ items }: Props) {
  if (items.length === 0) {
    return null;
  }

  return (
    <nav className={styles.breadcrumbs} aria-label="מיקום בעמוד">
      <ol className={styles.breadcrumbList}>
        {items.map((item, index) => {
          const isLast = index === items.length - 1;
          return (
            <li key={`${item.label}-${index}`} className={styles.breadcrumbItem}>
              {item.href && !isLast ? (
                <Link href={item.href}>{item.label}</Link>
              ) : (
                <span aria-current={isLast ? "page" : undefined}>{item.label}</span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
