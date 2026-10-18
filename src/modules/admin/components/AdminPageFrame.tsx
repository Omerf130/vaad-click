import type { ReactNode } from "react";

import {
  AdminBreadcrumbs,
  type AdminBreadcrumbItem,
} from "@/modules/admin/components/AdminBreadcrumbs";
import styles from "@/modules/admin/components/AdminPageFrame.module.scss";

export type AdminPageFrameProps = {
  title: string;
  subtitle?: string;
  breadcrumbs?: AdminBreadcrumbItem[];
  toolbar?: ReactNode;
  children: ReactNode;
};

export function AdminPageFrame({ title, subtitle, breadcrumbs, toolbar, children }: AdminPageFrameProps) {
  return (
    <div className={styles.frame}>
      {breadcrumbs?.length ? <AdminBreadcrumbs items={breadcrumbs} /> : null}
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>{title}</h1>
          {subtitle ? <p className={styles.subtitle}>{subtitle}</p> : null}
        </div>
        {toolbar ? <div className={styles.toolbar}>{toolbar}</div> : null}
      </header>
      <div className={styles.body}>{children}</div>
    </div>
  );
}
