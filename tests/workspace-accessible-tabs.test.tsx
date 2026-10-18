/**
 * @vitest-environment jsdom
 */
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { WorkspaceAccessibleTabs } from "@/modules/debt-cases/ui/WorkspaceAccessibleTabs";

describe("WorkspaceAccessibleTabs", () => {
  it("shows only the active tab panel", () => {
    const onTabChange = vi.fn();

    render(
      <WorkspaceAccessibleTabs
        ariaLabel="בדיקה"
        activeTabId="a"
        onTabChange={onTabChange}
        tabs={[
          { id: "a", label: "ראשון", panel: <p>תוכן א</p> },
          { id: "b", label: "שני", panel: <p>תוכן ב</p> },
        ]}
      />,
    );

    const panelA = screen.getByText("תוכן א").closest('[role="tabpanel"]');
    const panelB = screen.getByText("תוכן ב").closest('[role="tabpanel"]');
    expect(panelA?.hasAttribute("hidden")).toBe(false);
    expect(panelB?.hasAttribute("hidden")).toBe(true);

    fireEvent.click(screen.getByRole("tab", { name: "שני" }));
    expect(onTabChange).toHaveBeenCalledWith("b");
  });

  it("keeps inactive panel mounted when mountHiddenPanels is true", () => {
    render(
      <WorkspaceAccessibleTabs
        ariaLabel="בדיקה"
        activeTabId="a"
        onTabChange={() => undefined}
        mountHiddenPanels
        tabs={[
          { id: "a", label: "ראשון", panel: <input aria-label="שדה טופס" /> },
          { id: "b", label: "שני", panel: <p>אחר</p> },
        ]}
      />,
    );

    expect(screen.getByLabelText("שדה טופס")).toBeTruthy();
    expect(screen.getByText("אחר").closest('[role="tabpanel"]')?.hasAttribute("hidden")).toBe(true);
  });
});
