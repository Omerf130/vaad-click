import { describe, expect, it } from "vitest";

import {
  LAWYER_CASE_SECTION_LEGAL_READINESS,
  LAWYER_CASE_SECTION_PARTIES,
  LAWYER_CASE_TAB_OVERVIEW,
  LAWYER_CASE_TAB_WARNING_LETTER,
  isLawyerCaseOverviewSection,
  resolveLawyerCaseTabForSection,
} from "@/modules/debt-cases/presentation/lawyer-case-section-navigation";

describe("lawyer case section navigation", () => {
  it("maps overview sections to overview tab", () => {
    expect(resolveLawyerCaseTabForSection(LAWYER_CASE_SECTION_PARTIES)).toBe(LAWYER_CASE_TAB_OVERVIEW);
    expect(resolveLawyerCaseTabForSection(LAWYER_CASE_SECTION_LEGAL_READINESS)).toBe(
      LAWYER_CASE_TAB_OVERVIEW,
    );
  });

  it("defaults unknown sections to overview tab", () => {
    expect(resolveLawyerCaseTabForSection("unknown")).toBe(LAWYER_CASE_TAB_OVERVIEW);
  });

  it("does not treat warning-letter as overview section", () => {
    expect(isLawyerCaseOverviewSection(LAWYER_CASE_SECTION_PARTIES)).toBe(true);
    expect(isLawyerCaseOverviewSection(LAWYER_CASE_TAB_WARNING_LETTER)).toBe(false);
  });
});
