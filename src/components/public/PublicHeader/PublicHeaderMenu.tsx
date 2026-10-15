"use client";

import { useCallback, useId, useState } from "react";

import { ButtonLink } from "@/components/ui/Button/ButtonLink";
import { homepageHeader } from "@/content/homepage";
import type { PublicHeaderNavAction } from "@/shared/navigation/public-header-auth-nav";
import { shouldCloseMobileMenuOnAnchorClick } from "@/shared/navigation/mobile-menu";
import styles from "./PublicHeader.module.scss";

const navItems = [
  { href: "#how-it-works", label: homepageHeader.navHowItWorks },
  { href: "#who-for", label: homepageHeader.navWhoFor },
] as const;

type Props = {
  authActions: PublicHeaderNavAction[];
};

export function PublicHeaderMenu({ authActions }: Props) {
  const [menuOpen, setMenuOpen] = useState(false);
  const panelId = useId();

  const closeMenu = useCallback(() => setMenuOpen(false), []);

  const onAnchorClick = useCallback(
    (href: string) => {
      if (shouldCloseMobileMenuOnAnchorClick(menuOpen, href)) {
        closeMenu();
      }
    },
    [closeMenu, menuOpen],
  );

  return (
    <>
      <button
        type="button"
        className={styles.menuToggle}
        aria-expanded={menuOpen}
        aria-controls={panelId}
        onClick={() => setMenuOpen((open) => !open)}
      >
        {menuOpen ? "סגירת תפריט" : "תפריט"}
      </button>

      <div
        id={panelId}
        className={[styles.menuPanel, menuOpen ? styles.menuPanelOpen : ""]
          .filter(Boolean)
          .join(" ")}
      >
        <nav className={styles.nav} aria-label="ניווט ראשי">
          {navItems.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className={styles.navLink}
              onClick={() => onAnchorClick(item.href)}
            >
              {item.label}
            </a>
          ))}
        </nav>

        <div className={styles.actions}>
          {authActions.map((action) => (
            <ButtonLink
              key={`${action.href}-${action.label}`}
              href={action.href}
              variant={action.variant}
              size="sm"
              onClick={closeMenu}
            >
              {action.label}
            </ButtonLink>
          ))}
        </div>
      </div>
    </>
  );
}
