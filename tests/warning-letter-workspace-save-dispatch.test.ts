import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

describe("WarningLetterLawyerDraftWorkspace save dispatch (regression)", () => {
  it("submits explicit FormData inside startTransition (not native form action with late DOM fields)", () => {
    const source = readFileSync(
      join(process.cwd(), "src/modules/warning-letters/ui/WarningLetterLawyerDraftWorkspace.tsx"),
      "utf8",
    );

    expect(source).toMatch(/startTransition\s*\(\s*\(\)\s*=>\s*\{\s*dispatchSave\s*\(/);
    expect(source).toMatch(/buildWarningLetterDraftSaveFormDataFromChanged/);
    expect(source).toMatch(/event\.preventDefault\s*\(\s*\)/);
    expect(source).not.toMatch(/action=\{dispatchSave\}/);
  });
});
