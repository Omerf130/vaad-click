"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { getOperatorNavItems } from "@/modules/portal/presentation/operator-portal-nav";
import styles from "@/modules/portal/ui/OperatorPortalShell.module.scss";

type Props = {
  primaryBuildingId?: string | null;
};

function isNavActive(pathname: string, item: { href: string; activePrefix?: string }): boolean {
  const prefix = item.activePrefix ?? item.href;
  if (prefix === "/app") {
    return pathname === "/app";
  }
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

export function PortalOperatorNav({ primaryBuildingId }: Props) {
  const pathname = usePathname();
  const items = getOperatorNavItems({ primaryBuildingId });

  return (
    <nav className={styles.nav} aria-label="ניווט אזור מפעילים">
      <ul className={styles.navList}>
        {items.map((item) => {
          const active = isNavActive(pathname, item);
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                className={active ? styles.navLinkActive : styles.navLink}
                aria-current={active ? "page" : undefined}
              >
                {item.labelHe}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
