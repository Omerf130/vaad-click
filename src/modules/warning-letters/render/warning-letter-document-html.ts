import {
  WARNING_LETTER_REVIEW_PDF_SIGNATURE_PLACEHOLDER_HE,
} from "@/modules/warning-letters/pdf/warning-letter-pdf.constants";
import type { WarningLetterDocumentSegment } from "@/modules/warning-letters/render/warning-letter-document-segments";

export type WarningLetterHtmlRenderVariant = "workspacePreview" | "reviewPrint" | "operativePrint";

export function escapeWarningLetterHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function renderDebtTableHtml(
  segment: Extract<WarningLetterDocumentSegment, { kind: "debtTable" }>,
): string {
  return `
    <table class="debtTable" dir="rtl">
      <thead>
        <tr><th>מספר חודשי פיגור</th><th>סכום חוב</th></tr>
      </thead>
      <tbody>
        <tr>
          <td>סה"כ ${segment.debtMonthsCount} חודשים</td>
          <td>${escapeWarningLetterHtml(segment.principalDisplay)}</td>
        </tr>
        <tr class="debtTotal">
          <td>סה״כ :</td>
          <td>${escapeWarningLetterHtml(segment.principalDisplay)}</td>
        </tr>
      </tbody>
    </table>`;
}

export function renderWarningLetterSegmentHtml(
  segment: WarningLetterDocumentSegment,
  variant: WarningLetterHtmlRenderVariant,
): string {
  switch (segment.kind) {
    case "letterhead":
      if (variant === "reviewPrint" || variant === "operativePrint") {
        return `<header class="letterhead"><p class="firmName">${escapeWarningLetterHtml(segment.firmName)}</p><hr class="letterheadRule" /></header>`;
      }
      return `<header class="letterhead"><p class="firmName">${escapeWarningLetterHtml(segment.firmName)}</p><p class="previewBanner" role="status">טיוטה לתצוגה בלבד — לא נשלחה</p></header>`;
    case "metaRow":
      return `<div class="metaRow"><span>${escapeWarningLetterHtml(segment.addressee)}</span><span>${escapeWarningLetterHtml(segment.dateAndReference)}</span></div>`;
    case "debtorName":
      return `<p class="debtorName">${escapeWarningLetterHtml(segment.text)}</p>`;
    case "address":
      return `<p class="address">${escapeWarningLetterHtml(segment.text).replace(/\n/g, "<br />")}</p>`;
    case "deliveryChannel":
      return `<p class="deliveryChannel"><u>${escapeWarningLetterHtml(segment.text)}</u></p>`;
    case "subject":
      return `<p class="subject"><strong>${escapeWarningLetterHtml(segment.text)}</strong></p>`;
    case "intro":
      return `<p class="intro">${escapeWarningLetterHtml(segment.text)}</p>`;
    case "clause":
      return `<p class="clause"><span class="clauseNumber">${segment.displayNumber}.</span> ${escapeWarningLetterHtml(segment.body)}</p>`;
    case "debtTable":
      return renderDebtTableHtml(segment);
    case "paymentBlock":
      return `<div class="paymentBlock">${escapeWarningLetterHtml(segment.body).replace(/\n/g, "<br />")}</div>`;
    case "contact":
      return `<p class="contact">לבירורים נוספים, ניתן להתקשר לנייד: ${escapeWarningLetterHtml(segment.inquiriesMobileDisplay)}</p>`;
    case "signature":
      if (variant === "reviewPrint") {
        return `<footer class="signature"><p>בברכה,</p><p class="signaturePlaceholder">${escapeWarningLetterHtml(WARNING_LETTER_REVIEW_PDF_SIGNATURE_PLACEHOLDER_HE)}</p><p class="signatoryName">${escapeWarningLetterHtml(segment.signatoryName)}</p><p class="barRegistration">מספר בלשכת עורכי הדין: ${escapeWarningLetterHtml(segment.barRegistrationNumber)}</p></footer>`;
      }
      if (variant === "operativePrint") {
        return `<footer class="signature"><p>בברכה,</p><p class="signatoryName">${escapeWarningLetterHtml(segment.signatoryName)}</p><p class="barRegistration">מספר בלשכת עורכי הדין: ${escapeWarningLetterHtml(segment.barRegistrationNumber)}</p></footer>`;
      }
      return `<footer class="signature"><p>בברכה,</p><p class="signaturePlaceholder">[מקום לחתימה וחותמת — לא ב-CP8.4B]</p><p>${escapeWarningLetterHtml(segment.signatoryName)}</p><p>${escapeWarningLetterHtml(segment.barRegistrationNumber)}</p></footer>`;
    case "evidence":
      return `<p class="evidence">${escapeWarningLetterHtml(segment.text)}</p>`;
    default:
      return "";
  }
}

export function renderWarningLetterBodyHtml(
  segments: WarningLetterDocumentSegment[],
  variant: WarningLetterHtmlRenderVariant,
): string {
  return segments.map((segment) => renderWarningLetterSegmentHtml(segment, variant)).join("\n");
}