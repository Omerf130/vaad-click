import { WARNING_LETTER_PAYMENT_LINK_PREVIEW_PLACEHOLDER } from "@/modules/warning-letters/config/lawyer-office-letter-config";
import type { WarningLetterContentSnapshot } from "@/modules/warning-letters/snapshot/warning-letter-snapshot.types";

const INTERNAL_PLACEHOLDER_PATTERN = /\[[^\]]{3,}\]/u;

export function collectOperativeFinalSnapshotBlockersHe(
  snapshot: WarningLetterContentSnapshot,
): string[] {
  const blockers: string[] = [];

  if (snapshot.paymentLinkPlaceholder.includes("[") || snapshot.paymentLinkPlaceholder.includes("]")) {
    blockers.push("קישור תשלום אינו מאומת — לא ניתן לסגור מסמך סופי עם מציין מקום.");
  }

  if (snapshot.previewWarningHe?.trim()) {
    blockers.push("הטיוטה מכילה אזהרות תצוגה — יש לתקן נתונים לפני סגירה סופית.");
  }

  for (const clause of snapshot.numberedClauses) {
    if (clause.body.includes(WARNING_LETTER_PAYMENT_LINK_PREVIEW_PLACEHOLDER)) {
      blockers.push("סעיף התשלום מכיל מציין מקום לקישור תשלום — חסום לסגירה סופית (ללא סליקה).");
      break;
    }
    if (INTERNAL_PLACEHOLDER_PATTERN.test(clause.body)) {
      blockers.push("גוף המכתב מכיל מצייני מקום טכניים — יש להסירם לפני סגירה סופית.");
      break;
    }
  }

  return blockers;
}