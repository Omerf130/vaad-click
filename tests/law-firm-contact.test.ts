import { describe, expect, it } from "vitest";

import {
  lawFirmBranchTelHref,
  lawFirmIdentity,
  lawFirmMailtoHref,
} from "@/content/law-firm";

describe("law firm contact configuration", () => {
  it("includes approved lawyer identity and both branches", () => {
    expect(lawFirmIdentity.lawyerDisplayName).toContain("צבי הרשל אשכנזי");
    expect(lawFirmIdentity.branches).toHaveLength(2);
    expect(lawFirmIdentity.branches.map((b) => b.branchName)).toEqual([
      "סניף צפון",
      "סניף מרכז",
    ]);
  });

  it("builds tel and mailto links without whatsapp", () => {
    const north = lawFirmIdentity.branches[0]!;
    expect(lawFirmBranchTelHref(north)).toBe("tel:0779978330");
    expect(lawFirmMailtoHref()).toBe("mailto:azvika@gmail.com");
    expect(JSON.stringify(lawFirmIdentity)).not.toMatch(/whatsapp/i);
  });

  it("does not leave required contact fields empty", () => {
    expect(lawFirmIdentity.email.trim()).not.toBe("");
    for (const branch of lawFirmIdentity.branches) {
      expect(branch.address.trim()).not.toBe("");
      expect(branch.phoneDisplay.trim()).not.toBe("");
      expect(branch.phoneTel.trim()).not.toBe("");
    }
  });
});
