"use client";

import {
  useCallback,
  useId,
  useRef,
  type KeyboardEvent,
  type ReactNode,
} from "react";

import styles from "@/modules/debt-cases/ui/DebtCaseWorkspace.module.scss";

export type WorkspaceTabDefinition = {
  id: string;
  label: string;
  panel: ReactNode;
};

type Props = {
  tabs: WorkspaceTabDefinition[];
  activeTabId: string;
  onTabChange: (tabId: string) => void;
  ariaLabel: string;
  mountHiddenPanels?: boolean;
};

export function WorkspaceAccessibleTabs({
  tabs,
  activeTabId,
  onTabChange,
  ariaLabel,
  mountHiddenPanels = true,
}: Props) {
  const baseId = useId();
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const focusTab = useCallback((index: number) => {
    const tab = tabs[index];
    if (!tab) {
      return;
    }
    onTabChange(tab.id);
    tabRefs.current[index]?.focus();
  }, [onTabChange, tabs]);

  function handleTabKeyDown(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    let nextIndex: number | null = null;
    switch (event.key) {
      case "ArrowRight":
        nextIndex = index > 0 ? index - 1 : tabs.length - 1;
        break;
      case "ArrowLeft":
        nextIndex = index < tabs.length - 1 ? index + 1 : 0;
        break;
      case "Home":
        nextIndex = 0;
        break;
      case "End":
        nextIndex = tabs.length - 1;
        break;
      default:
        return;
    }
    event.preventDefault();
    focusTab(nextIndex);
  }

  return (
    <div className={styles.tabsRoot}>
      <div className={styles.tabListScroll}>
        <div role="tablist" aria-label={ariaLabel} className={styles.tabList}>
          {tabs.map((tab, index) => {
            const selected = tab.id === activeTabId;
            const tabId = `${baseId}-tab-${tab.id}`;
            const panelId = `${baseId}-panel-${tab.id}`;
            return (
              <button
                key={tab.id}
                ref={(node) => {
                  tabRefs.current[index] = node;
                }}
                type="button"
                role="tab"
                id={tabId}
                aria-selected={selected}
                aria-controls={panelId}
                tabIndex={selected ? 0 : -1}
                className={selected ? styles.tabActive : styles.tab}
                onClick={() => onTabChange(tab.id)}
                onKeyDown={(event) => handleTabKeyDown(event, index)}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {tabs.map((tab) => {
        const selected = tab.id === activeTabId;
        const tabId = `${baseId}-tab-${tab.id}`;
        const panelId = `${baseId}-panel-${tab.id}`;

        if (!mountHiddenPanels && !selected) {
          return null;
        }

        return (
          <div
            key={tab.id}
            role="tabpanel"
            id={panelId}
            aria-labelledby={tabId}
            hidden={!selected}
            className={styles.tabPanel}
          >
            {tab.panel}
          </div>
        );
      })}
    </div>
  );
}
