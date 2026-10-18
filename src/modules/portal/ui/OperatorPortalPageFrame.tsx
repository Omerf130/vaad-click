import { Container } from "@/components/ui";
import { PortalBreadcrumbs, type BreadcrumbItem } from "@/modules/portal/ui/PortalBreadcrumbs";
import styles from "@/modules/portal/ui/OperatorPortalShell.module.scss";

type Props = {
  title: string;
  subtitle?: string | null;
  breadcrumbs?: BreadcrumbItem[];
  children: React.ReactNode;
};

export function OperatorPortalPageFrame({ title, subtitle, breadcrumbs, children }: Props) {
  return (
    <Container>
      <div className={styles.pageFrame}>
        {breadcrumbs?.length ? <PortalBreadcrumbs items={breadcrumbs} /> : null}
        <header className={styles.pageHeader}>
          <h1 className={styles.pageTitle}>{title}</h1>
          {subtitle ? <p className={styles.pageSubtitle}>{subtitle}</p> : null}
        </header>
        {children}
      </div>
    </Container>
  );
}
