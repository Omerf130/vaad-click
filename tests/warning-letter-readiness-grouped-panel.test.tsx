/**
 * @vitest-environment jsdom
 */
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { WarningLetterReadinessGroupedPanel } from "@/modules/warning-letters/ui/WarningLetterReadinessGroupedPanel";
import type { WarningLetterLegalReadinessChecklist } from "@/modules/warning-letters/services/warning-letter-legal-readiness-checklist.service";

const checklist: WarningLetterLegalReadinessChecklist = {
  items: [
    { id: "a", labelHe: "דרישה שהושלמה", status: "complete" },
    { id: "b", labelHe: "דרישה חסרה", status: "missing", detailHe: "פרט" },
    { id: "c", labelHe: "אישור עו\"ד", status: "needs_lawyer" },
    { id: "d", labelHe: "אינטגרציה", status: "blocked_integration", detailHe: "לא פעיל" },
  ],
  wordingApprovalAllowed: false,
  finalizationAllowed: false,
  dispatchAllowed: false,
};

describe("WarningLetterReadinessGroupedPanel", () => {
  it("shows grouped counts and item labels", () => {
    render(<WarningLetterReadinessGroupedPanel checklist={checklist} />);
    expect(screen.getByLabelText("סיכום לפי קטגוריה").textContent).toContain("דרישות חסרות (1)");
    expect(screen.getByText("דרישה חסרה")).toBeTruthy();
    expect(screen.getAllByText("אינטגרציה").length).toBeGreaterThan(0);
  });
});
