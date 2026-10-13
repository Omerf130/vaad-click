import { describe, expect, it } from "vitest";
import { homepageProcess, LAWYER_REVIEW_ITEMS } from "@/content/homepage";

describe("homepage content", () => {
  it("defines three process steps without auto-send implication in intro", () => {
    expect(homepageProcess.steps).toHaveLength(3);
    expect(homepageProcess.intro).toMatch(/אישור עורך הדין/);
  });

  it("lists lawyer review topics", () => {
    expect(LAWYER_REVIEW_ITEMS.length).toBeGreaterThan(0);
  });
});
