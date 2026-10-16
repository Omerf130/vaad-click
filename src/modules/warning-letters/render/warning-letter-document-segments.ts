import { LAWYER_OFFICE_LETTER_CONFIG } from "@/modules/warning-letters/config/lawyer-office-letter-config";
import { isLawyerEditableClauseId } from "@/modules/warning-letters/domain/warning-letter-editable-clause";
import { formatLetterDateDisplayHe } from "@/modules/warning-letters/snapshot/compute-letter-dates";
import type { WarningLetterContentSnapshot } from "@/modules/warning-letters/snapshot/warning-letter-snapshot.types";

export type WarningLetterDocumentSegment =
  | { kind: "letterhead"; firmName: string }
  | { kind: "metaRow"; addressee: string; dateAndReference: string }
  | { kind: "debtorName"; text: string }
  | { kind: "address"; text: string }
  | { kind: "deliveryChannel"; text: string }
  | { kind: "subject"; text: string }
  | { kind: "intro"; text: string }
  | {
      kind: "clause";
      clauseId: string;
      displayNumber: number;
      body: string;
      editable: boolean;
    }
  | { kind: "debtTable"; debtMonthsCount: number; principalDisplay: string }
  | { kind: "paymentBlock"; body: string }
  | { kind: "contact"; inquiriesMobileDisplay: string }
  | { kind: "signature"; signatoryName: string; barRegistrationNumber: string }
  | { kind: "evidence"; text: string };

export function buildWarningLetterDocumentSegments(
  snapshot: WarningLetterContentSnapshot,
): WarningLetterDocumentSegment[] {
  const letterDateDisplay = formatLetterDateDisplayHe(snapshot.letterDateIso);
  const segments: WarningLetterDocumentSegment[] = [
    { kind: "letterhead", firmName: LAWYER_OFFICE_LETTER_CONFIG.firmDisplayName },
    {
      kind: "metaRow",
      addressee: snapshot.addresseeLines[0] ?? "לכבוד:",
      dateAndReference: `תאריך: ${letterDateDisplay} · תיק: ${snapshot.letterCaseReference}`,
    },
    { kind: "debtorName", text: snapshot.debtorNamesLine },
    { kind: "address", text: snapshot.apartmentAddressLine },
    { kind: "deliveryChannel", text: snapshot.deliveryChannelLabel },
    { kind: "subject", text: snapshot.subjectLine },
    { kind: "intro", text: snapshot.introductionParagraph },
  ];

  for (const clause of snapshot.numberedClauses) {
    if (clause.clauseId === "payment_block") {
      segments.push({ kind: "paymentBlock", body: clause.body });
      continue;
    }
    segments.push({
      kind: "clause",
      clauseId: clause.clauseId,
      displayNumber: clause.displayNumber,
      body: clause.body,
      editable: isLawyerEditableClauseId(clause.clauseId),
    });
    if (clause.clauseId === "debt_table_intro") {
      segments.push({
        kind: "debtTable",
        debtMonthsCount: snapshot.debtMonthsCount,
        principalDisplay: snapshot.principalDisplay,
      });
    }
  }

  segments.push(
    { kind: "contact", inquiriesMobileDisplay: snapshot.inquiriesMobileDisplay },
    {
      kind: "signature",
      signatoryName: snapshot.signatoryName,
      barRegistrationNumber: snapshot.barRegistrationNumber,
    },
    { kind: "evidence", text: snapshot.evidenceDisclaimer },
  );

  return segments;
}
