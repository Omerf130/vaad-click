import {
  computePrintedDeadlineDateIso,
  formatLetterDateDisplayHe,
} from "@/modules/warning-letters/snapshot/compute-letter-dates";
import type { WarningLetterContentSnapshot } from "@/modules/warning-letters/snapshot/warning-letter-snapshot.types";
import { computeWarningLetterContentSha256 } from "@/modules/warning-letters/snapshot/warning-letter-canonical-hash";

export function applyFinalizationLetterDatesToSnapshot(
  snapshot: WarningLetterContentSnapshot,
  letterDateIso: string,
): WarningLetterContentSnapshot {
  const printedDeadlineDateIso = computePrintedDeadlineDateIso(letterDateIso);
  const printedDeadlineDateDisplay = formatLetterDateDisplayHe(printedDeadlineDateIso);
  const previousDeadlineDisplay = snapshot.printedDeadlineDateDisplay;

  const numberedClauses = snapshot.numberedClauses.map((clause) => {
    if (!previousDeadlineDisplay?.trim() || !clause.body.includes(previousDeadlineDisplay)) {
      return clause;
    }
    return {
      ...clause,
      body: clause.body.replaceAll(previousDeadlineDisplay, printedDeadlineDateDisplay),
    };
  });

  const next: WarningLetterContentSnapshot = {
    ...snapshot,
    letterDateIso,
    printedDeadlineDateIso,
    printedDeadlineDateDisplay,
    numberedClauses,
    previewWarningHe: null,
    snapshotCreatedAtIso: new Date().toISOString(),
    contentSha256: "",
  };

  next.contentSha256 = computeWarningLetterContentSha256(next);
  return next;
}