export const LAWYER_CASE_TAB_OVERVIEW = "overview";
export const LAWYER_CASE_TAB_DOCUMENTS = "documents";
export const LAWYER_CASE_TAB_ACTIVITY = "activity";
export const LAWYER_CASE_TAB_WARNING_LETTER = "warning-letter";

export const LAWYER_CASE_SECTION_PARTIES = "case-parties";
export const LAWYER_CASE_SECTION_DEBT = "case-debt";
export const LAWYER_CASE_SECTION_LEGAL_READINESS = "case-legal-readiness";
export const LAWYER_CASE_SECTION_OVERVIEW = "case-overview";

const SECTION_TO_TAB: Record<string, string> = {
  [LAWYER_CASE_SECTION_OVERVIEW]: LAWYER_CASE_TAB_OVERVIEW,
  [LAWYER_CASE_SECTION_PARTIES]: LAWYER_CASE_TAB_OVERVIEW,
  [LAWYER_CASE_SECTION_DEBT]: LAWYER_CASE_TAB_OVERVIEW,
  [LAWYER_CASE_SECTION_LEGAL_READINESS]: LAWYER_CASE_TAB_OVERVIEW,
};

export function resolveLawyerCaseTabForSection(sectionId: string): string {
  return SECTION_TO_TAB[sectionId] ?? LAWYER_CASE_TAB_OVERVIEW;
}

export function isLawyerCaseOverviewSection(sectionId: string): boolean {
  return sectionId in SECTION_TO_TAB;
}
