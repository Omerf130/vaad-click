import { describe, expect, it } from "vitest";

import {
  buildActiveDraftEditConcurrencyQuery,
  resolveWarningLetterDraftConcurrencyRevision,
  warningLetterDraftConcurrencyMatchesExpected,
} from "@/modules/warning-letters/domain/warning-letter-draft-concurrency";

describe("warning letter draft concurrency (legacy + edit)", () => {
  it("treats missing concurrencyRevision as 1 for legacy drafts", () => {
    expect(resolveWarningLetterDraftConcurrencyRevision(undefined)).toBe(1);
    expect(
      warningLetterDraftConcurrencyMatchesExpected({
        storedRaw: undefined,
        expected: 1,
      }),
    ).toBe(true);
  });

  it("rejects when stored concurrency is ahead of client token", () => {
    expect(
      warningLetterDraftConcurrencyMatchesExpected({
        storedRaw: 2,
        expected: 1,
      }),
    ).toBe(false);
  });

  it("builds mongo query matching legacy rows for expected token 1", () => {
    const query = buildActiveDraftEditConcurrencyQuery(1);
    expect(query).toHaveProperty("$or");
    expect(JSON.stringify(query)).toContain("$exists");
  });

  it("uses exact match for expected token greater than 1", () => {
    expect(buildActiveDraftEditConcurrencyQuery(3)).toEqual({
      concurrencyRevision: 3,
    });
  });
});
