import { describe, expect, it } from "vitest";
import { shouldCloseMobileMenuOnAnchorClick } from "@/shared/navigation/mobile-menu";

describe("shouldCloseMobileMenuOnAnchorClick", () => {
  it("closes when menu is open and href is an in-page anchor", () => {
    expect(shouldCloseMobileMenuOnAnchorClick(true, "#how-it-works")).toBe(true);
  });

  it("does not close when menu is already closed", () => {
    expect(shouldCloseMobileMenuOnAnchorClick(false, "#how-it-works")).toBe(false);
  });

  it("does not close for non-anchor href", () => {
    expect(shouldCloseMobileMenuOnAnchorClick(true, "/login")).toBe(false);
  });

  it("does not close for bare hash", () => {
    expect(shouldCloseMobileMenuOnAnchorClick(true, "#")).toBe(false);
  });
});
