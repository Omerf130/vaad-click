import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const workspaceSource = readFileSync(
  join(
    process.cwd(),
    "src",
    "modules",
    "financial-settings",
    "ui",
    "FinancialSettingsDraftWorkspace.tsx",
  ),
  "utf8",
);

describe("financial settings discard confirmation", () => {
  it("opens a confirmation dialog before submitting discard", () => {
    expect(workspaceSource).toMatch(/ConfirmDiscardDialog/);
    expect(workspaceSource).toMatch(/setDiscardDialogOpen\(true\)/);
    expect(workspaceSource).toMatch(/discardFormRef\.current\?\.requestSubmit\(\)/);
  });

  it("does not expose a one-click discard submit in the publish tab", () => {
    expect(workspaceSource).not.toMatch(/<form action=\{discardAction\}>\s*<input type="hidden" name="confirmDiscard"/);
  });
});
