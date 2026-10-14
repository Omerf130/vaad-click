import { describe, expect, it } from "vitest";

import {
  evaluatePublishReviewEligibility,
  shouldShowPublishReviewDialog,
} from "@/modules/financial-settings/presentation/publish-review-visibility";

describe("publish review dialog visibility", () => {
  it("shows the dialog whenever review is open (independent of publish action state)", () => {
    expect(shouldShowPublishReviewDialog(true)).toBe(true);
    expect(shouldShowPublishReviewDialog(false)).toBe(false);
  });

  it("does not tie visibility to initial publishState.ok", () => {
    expect(shouldShowPublishReviewDialog(true)).toBe(true);
  });
});

describe("publish review eligibility", () => {
  it("blocks review while the draft form is dirty", () => {
    const result = evaluatePublishReviewEligibility({ isDirty: true });
    expect(result.allowed).toBe(false);
    expect(result.reasonHe).toMatch(/שמור/);
  });

  it("allows review when the draft matches the last saved revision", () => {
    expect(evaluatePublishReviewEligibility({ isDirty: false }).allowed).toBe(true);
  });
});
