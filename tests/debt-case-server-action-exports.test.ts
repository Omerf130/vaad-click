import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import {
  adminDebtCaseReviewActionInitialState,
} from "@/modules/debt-cases/presentation/admin-debt-case-review-action-state";

const DEBT_CASE_ACTIONS_DIR = join(
  process.cwd(),
  "src/modules/debt-cases/actions",
);

function readActionModuleSource(fileName: string): string {
  return readFileSync(join(DEBT_CASE_ACTIONS_DIR, fileName), "utf8");
}

function exportedNonAsyncBindings(source: string): string[] {
  const matches = source.matchAll(/^export (?!async function)(\w+)? ?(.*)$/gm);
  const invalid: string[] = [];
  for (const match of matches) {
    const exportClause = match[0];
    if (exportClause.includes("export async function")) {
      continue;
    }
    if (exportClause.startsWith("export type")) {
      continue;
    }
    if (exportClause.startsWith("export {")) {
      continue;
    }
    invalid.push(exportClause.trim());
  }
  return invalid;
}

describe("debt-case server action module boundaries", () => {
  it("keeps admin review actions limited to async function exports", () => {
    const source = readActionModuleSource("admin-debt-case-review.actions.ts");
    expect(source.startsWith('"use server";')).toBe(true);
    expect(exportedNonAsyncBindings(source)).toEqual([]);
  });

  it("keeps portal debt-case actions free of exported object constants", () => {
    const source = readActionModuleSource("portal-debt-case.actions.ts");
    expect(source.startsWith('"use server";')).toBe(true);
    expect(source).not.toMatch(/^export const /m);
  });

  it("provides review action initial state outside the server module", () => {
    expect(adminDebtCaseReviewActionInitialState).toEqual({ ok: false });
  });
});
