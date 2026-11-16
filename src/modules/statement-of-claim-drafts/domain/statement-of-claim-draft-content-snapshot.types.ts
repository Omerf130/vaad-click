import type { StatementOfClaimTemplateSectionId } from "@/modules/statement-of-claim-templates/domain/statement-of-claim-template-section";

export const STATEMENT_OF_CLAIM_DRAFT_CONTENT_FORMAT_VERSION = 1 as const;

export type StatementOfClaimDraftSectionRendered = {
  sectionId: StatementOfClaimTemplateSectionId;
  titleHe: string;
  /** Factual/system render at generation time (preserved across lawyer edits). */
  bodySystemBaseline: string;
  bodyRendered: string;
  titleLawyerOverride?: string | null;
  lawyerBodyOverride?: string | null;
  hasIncompleteLawyerFields: boolean;
};

export function resolveStatementOfClaimSectionDisplayTitle(
  section: StatementOfClaimDraftSectionRendered,
): string {
  return section.titleLawyerOverride?.trim() || section.titleHe;
}

export function resolveStatementOfClaimSectionDisplayBody(
  section: StatementOfClaimDraftSectionRendered,
): string {
  return section.lawyerBodyOverride?.trim() || section.bodyRendered;
}

export type StatementOfClaimDraftDeliverySummary = {
  recordCount: number;
  hasConfirmedDelivery: boolean;
  channelsSummaryHe: string;
};

export type StatementOfClaimDraftContentSnapshot = {
  formatVersion: typeof STATEMENT_OF_CLAIM_DRAFT_CONTENT_FORMAT_VERSION;
  developmentOnly: true;
  manuallyEdited?: boolean;
  editedSectionIds?: string[];
  templateRevisionId: string;
  templateContentSha256: string;
  warningLetterFinalDocumentId: string;
  warningLetterFinalContentSha256: string;
  letterCaseReference: string;
  factualPlaceholders: Record<string, string>;
  lawyerControlledIncompleteTokens: string[];
  sections: StatementOfClaimDraftSectionRendered[];
  sourceSummary: {
    debtCaseRevision: number;
    buildingId: string;
    buildingAddressHe: string;
    debtorDisplayNameHe: string;
    debtPeriodHe: string;
    letterTotalDueDisplay: string;
    outstandingBalanceDisplay: string;
    hasDisputedResponse: boolean;
    delivery: StatementOfClaimDraftDeliverySummary;
  };
};

export function snapshotHasLawyerSectionEdits(
  snapshot: StatementOfClaimDraftContentSnapshot,
): boolean {
  return snapshot.sections.some(
    (s) =>
      Boolean(s.titleLawyerOverride?.trim()) ||
      Boolean(s.lawyerBodyOverride?.trim()),
  );
}

export function normalizeLegacyStatementOfClaimSection(
  section: StatementOfClaimDraftSectionRendered,
): StatementOfClaimDraftSectionRendered {
  const baseline = section.bodySystemBaseline ?? section.bodyRendered;
  return { ...section, bodySystemBaseline: baseline };
}