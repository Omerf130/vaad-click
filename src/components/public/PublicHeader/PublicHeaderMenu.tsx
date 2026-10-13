"use client";

import { useCallback, useId, useState } from "react";
import { Button } from "@/components/ui/Button/Button";
import { homepageHeader } from "@/content/homepage";
import { shouldCloseMobileMenuOnAnchorClick } from "@/shared/navigation/mobile-menu";
import styles from "./PublicHeader.module.scss";

const navItems = [
  { href: "#how-it-works", label: homepageHeader.navHowItWorks },
  { href: "#who-for", label: homepageHeader.navWhoFor },
] as const;

export function PublicHeaderMenu() {
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
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled
            title={homepageHeader.loginHint}
          >
            {homepageHeader.loginLabel}
          </Button>
          <Button
            type="button"
            variant="primary"
            size="sm"
            disabled
            title={homepageHeader.registerHint}
          >
            {homepageHeader.registerLabel}
          </Button>
        </div>
      </div>
    </>
  );
}
