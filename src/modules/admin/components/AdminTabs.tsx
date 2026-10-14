"use client";

import type { ReactNode } from "react";

import styles from "@/modules/admin/components/AdminTabs.module.scss";

export type AdminTabItem = {
  id: string;
  label: string;
  panel: ReactNode;
  hasError?: boolean;
};

export type AdminTabsProps = {
  tabs: AdminTabItem[];
  activeTabId: string;
  onTabChange: (tabId: string) => void;
  ariaLabel: string;
};

export function AdminTabs({ tabs, activeTabId, onTabChange, ariaLabel }: AdminTabsProps) {
  const activeTab = tabs.find((tab) => tab.id === activeTabId) ?? tabs[0];

  return (
    <div className={styles.root}>
      <div role="tablist" aria-label={ariaLabel} className={styles.tabList}>
        {tabs.map((tab) => {
          const selected = tab.id === activeTabId;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              id={`tab-${tab.id}`}
              aria-selected={selected}
              aria-controls={`panel-${tab.id}`}
              className={[styles.tab, selected ? styles.tabActive : "", tab.hasError ? styles.tabError : ""]
                .filter(Boolean)
                .join(" ")}
              onClick={() => onTabChange(tab.id)}
            >
              {tab.label}
              {tab.hasError ? <span className={styles.errorDot} aria-hidden="true" /> : null}
            </button>
          );
        })}
      </div>
      <div
        role="tabpanel"
        id={`panel-${activeTab?.id}`}
        aria-labelledby={`tab-${activeTab?.id}`}
        className={styles.panel}
      >
        {activeTab?.panel}
      </div>
    </div>
  );
}
