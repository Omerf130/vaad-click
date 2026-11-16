/** Structural section ids — titles only; no invented legal text in code. */
export const StatementOfClaimTemplateSectionId = {
  COURT_JURISDICTION: "court_jurisdiction",
  PLAINTIFF: "plaintiff",
  DEFENDANT: "defendant",
  PROPERTY_BUILDING: "property_building",
  DEBT_PERIOD: "debt_period",
  STATEMENT_OF_FACTS: "statement_of_facts",
  LEGAL_GROUNDS: "legal_grounds",
  FINANCIAL_BREAKDOWN: "financial_breakdown",
  WARNING_LETTER_DELIVERY: "warning_letter_delivery",
  EXHIBITS: "exhibits",
  REQUESTED_RELIEF: "requested_relief",
  LAWYER_SIGNATURE: "lawyer_signature",
} as const;

export type StatementOfClaimTemplateSectionId =
  (typeof StatementOfClaimTemplateSectionId)[keyof typeof StatementOfClaimTemplateSectionId];

export const STATEMENT_OF_CLAIM_TEMPLATE_SECTION_ORDER: readonly StatementOfClaimTemplateSectionId[] =
  [
    StatementOfClaimTemplateSectionId.COURT_JURISDICTION,
    StatementOfClaimTemplateSectionId.PLAINTIFF,
    StatementOfClaimTemplateSectionId.DEFENDANT,
    StatementOfClaimTemplateSectionId.PROPERTY_BUILDING,
    StatementOfClaimTemplateSectionId.DEBT_PERIOD,
    StatementOfClaimTemplateSectionId.STATEMENT_OF_FACTS,
    StatementOfClaimTemplateSectionId.LEGAL_GROUNDS,
    StatementOfClaimTemplateSectionId.FINANCIAL_BREAKDOWN,
    StatementOfClaimTemplateSectionId.WARNING_LETTER_DELIVERY,
    StatementOfClaimTemplateSectionId.EXHIBITS,
    StatementOfClaimTemplateSectionId.REQUESTED_RELIEF,
    StatementOfClaimTemplateSectionId.LAWYER_SIGNATURE,
  ];

export const STATEMENT_OF_CLAIM_SECTION_TITLE_HE: Record<
  StatementOfClaimTemplateSectionId,
  string
> = {
  [StatementOfClaimTemplateSectionId.COURT_JURISDICTION]: "בית משפט וסמכות שיפוט",
  [StatementOfClaimTemplateSectionId.PLAINTIFF]: "פרטי התובע/ת",
  [StatementOfClaimTemplateSectionId.DEFENDANT]: "פרטי הנתבע/ת",
  [StatementOfClaimTemplateSectionId.PROPERTY_BUILDING]: "נכס ובניין",
  [StatementOfClaimTemplateSectionId.DEBT_PERIOD]: "תקופת חוב",
  [StatementOfClaimTemplateSectionId.STATEMENT_OF_FACTS]: "עובדות",
  [StatementOfClaimTemplateSectionId.LEGAL_GROUNDS]: "בסיס משפטי",
  [StatementOfClaimTemplateSectionId.FINANCIAL_BREAKDOWN]: "פירוט כספי",
  [StatementOfClaimTemplateSectionId.WARNING_LETTER_DELIVERY]: "מכתב התראה ומשלוח",
  [StatementOfClaimTemplateSectionId.EXHIBITS]: "נספחים",
  [StatementOfClaimTemplateSectionId.REQUESTED_RELIEF]: "סעד מבוקש",
  [StatementOfClaimTemplateSectionId.LAWYER_SIGNATURE]: "עורך דין וחתימה",
};