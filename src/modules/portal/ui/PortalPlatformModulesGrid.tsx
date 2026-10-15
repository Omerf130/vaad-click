import Link from "next/link";

import type { PortalPlatformModule } from "@/modules/portal/presentation/portal-platform-modules";
import styles from "@/modules/portal/ui/OperatorPortalDashboard.module.scss";

type Props = {
  modules: PortalPlatformModule[];
};

export function PortalPlatformModulesGrid({ modules }: Props) {
  return (
    <div className={styles.moduleGrid}>
      {modules.map((module) => {
        if (module.status === "available" && module.href) {
          return (
            <Link key={module.id} href={module.href} className={styles.moduleTile}>
              <h3 className={styles.moduleTitle}>{module.titleHe}</h3>
              <p className={styles.moduleDescription}>{module.descriptionHe}</p>
            </Link>
          );
        }
        return (
          <div
            key={module.id}
            className={styles.moduleTileDisabled}
            aria-disabled="true"
            title="עדיין לא זמין"
          >
            <h3 className={styles.moduleTitle}>{module.titleHe}</h3>
            <p className={styles.moduleDescription}>{module.descriptionHe}</p>
            <span className={styles.moduleBadge}>בקרוב</span>
          </div>
        );
      })}
    </div>
  );
}
