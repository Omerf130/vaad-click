import { describe, expect, it } from "vitest";
import {
  homepageHero,
  homepageProcess,
  LAWYER_REVIEW_ITEMS,
} from "@/content/homepage";
import { lawFirmIdentity, lawFirmLegalServiceNotice } from "@/content/law-firm";

describe("homepage content", () => {
  it("surfaces law firm identity in hero", () => {
    expect(homepageHero.eyebrow).toContain(lawFirmIdentity.lawyerDisplayName);
    expect(homepageHero.supporting).toContain(lawFirmLegalServiceNotice);
  });

  it("defines four process steps with lawyer approval and future payment step", () => {
    expect(homepageProcess.steps).toHaveLength(4);
    expect(homepageProcess.intro).toMatch(/אישור עורך הדין/);
    const paymentStep = homepageProcess.steps[3];
    expect(paymentStep?.title).toBe("התשלום מגיע אליכם");
    expect(paymentStep?.futureCapability).toBe(true);
    expect(paymentStep?.body).toMatch(/אינן פעילות במערכת/);
    expect(paymentStep?.body).not.toMatch(/יום אחד|יומיים|תוך יום/);
  });

  it("lists lawyer review topics", () => {
    expect(LAWYER_REVIEW_ITEMS.length).toBeGreaterThan(0);
  });
});
