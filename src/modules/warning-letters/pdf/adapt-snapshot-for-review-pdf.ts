import { isWarningLetterOperativeDeadlinePolicyResolved } from "@/modules/warning-letters/domain/warning-letter-operative-policy";
import { WARNING_LETTER_REVIEW_PDF_DEADLINE_PLACEHOLDER_HE } from "@/modules/warning-letters/pdf/warning-letter-pdf.constants";
import type { WarningLetterContentSnapshot } from "@/modules/warning-letters/snapshot/warning-letter-snapshot.types";

/**
 * PDF-only adaptation — does not mutate persisted draft snapshots.
 * Replaces computed printed deadline display when operative policy is unresolved.
 */
export function adaptSnapshotForReviewPdf(
  snapshot: WarningLetterContentSnapshot,
): WarningLetterContentSnapshot {
  if (isWarningLetterOperativeDeadlinePolicyResolved()) {
    return snapshot;
  }

  const deadlineDisplay = snapshot.printedDeadlineDateDisplay;
  if (!deadlineDisplay?.trim()) {
    return snapshot;
  }

  const numberedClauses = snapshot.numberedClauses.map((clause) => {
    if (!clause.body.includes(deadlineDisplay)) {
      return clause;
    }
    return {
      ...clause,
      body: clause.body.replaceAll(
        deadlineDisplay,
        WARNING_LETTER_REVIEW_PDF_DEADLINE_PLACEHOLDER_HE,
      ),
    };
  });

  return { ...snapshot, numberedClauses };
}