import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

describe("lawyer case workspace UI contracts", () => {
  it("keeps warning-letter panels mounted for draft state safety", () => {
    const detail = readFileSync(
      join(process.cwd(), "src", "modules", "debt-cases", "ui", "lawyer", "LawyerDebtCaseReviewDetail.tsx"),
      "utf8",
    );
    expect(detail).toMatch(/mountHiddenPanels/);
  });

  it("uses danger variant for reject review action", () => {
    const actions = readFileSync(
      join(process.cwd(), "src", "modules", "debt-cases", "ui", "lawyer", "LawyerDebtCaseReviewActions.tsx"),
      "utf8",
    );
    expect(actions).toMatch(/variant="danger"/);
    expect(actions).toMatch(/onJumpToSection/);
  });

  it("exposes warning-letter back navigation to case overview", () => {
    const wl = readFileSync(
      join(
        process.cwd(),
        "src",
        "modules",
        "warning-letters",
        "ui",
        "WarningLetterLawyerDraftWorkspace.tsx",
      ),
      "utf8",
    );
    expect(wl).toMatch(/onBackToCaseOverview/);
    expect(wl).toMatch(/mountHiddenPanels/);
  });
});
