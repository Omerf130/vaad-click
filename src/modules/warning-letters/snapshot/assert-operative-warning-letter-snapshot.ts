import { WarningLetterMonetaryCompleteness } from "@/modules/warning-letters/domain/warning-letter-monetary-completeness";
import {
  WarningLetterError,
  WarningLetterErrorCode,
} from "@/modules/warning-letters/domain/warning-letter-errors";
import type { WarningLetterContentSnapshot } from "@/modules/warning-letters/snapshot/warning-letter-snapshot.types";

/** CP8.4C+ approval/dispatch must call this before persisting an operative snapshot. */
export function assertOperativeWarningLetterSnapshot(
  snapshot: WarningLetterContentSnapshot,
): void {
  if (!snapshot.isOperativeSnapshot) {
    throw new WarningLetterError(
      WarningLetterErrorCode.INCOMPLETE_OPERATIVE_SNAPSHOT,
      "Snapshot was built for non-operative preview only",
    );
  }
  if (snapshot.monetaryCompleteness !== WarningLetterMonetaryCompleteness.COMPLETE) {
    throw new WarningLetterError(
      WarningLetterErrorCode.INCOMPLETE_OPERATIVE_SNAPSHOT,
      "Monetary data is incomplete for operative letter snapshot",
    );
  }
  if (snapshot.settingsVersionId == null) {
    throw new WarningLetterError(
      WarningLetterErrorCode.MISSING_PUBLISHED_FINANCIAL_SETTINGS,
      "Operative snapshot requires published financial settings version id",
    );
  }
}
