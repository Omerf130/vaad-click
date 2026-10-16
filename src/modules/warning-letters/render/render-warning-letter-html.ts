import {
  buildWarningLetterDocumentSegments,
  type WarningLetterDocumentSegment,
} from "@/modules/warning-letters/render/warning-letter-document-segments";
import type { WarningLetterContentSnapshot } from "@/modules/warning-letters/snapshot/warning-letter-snapshot.types";

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function renderDebtTable(segment: Extract<WarningLetterDocumentSegment, { kind: "debtTable" }>): string {
  return `
    <table class="debtTable" dir="rtl">
      <thead>
        <tr><th>מספר חודשי פיגור</th><th>סכום חוב</th></tr>
      </thead>
      <tbody>
        <tr>
          <td>סה"כ ${segment.debtMonthsCount} חודשים</td>
          <td>${escapeHtml(segment.principalDisplay)}</td>
        </tr>
        <tr class="debtTotal">
          <td>סה״כ :</td>
          <td>${escapeHtml(segment.principalDisplay)}</td>
        </tr>
      </tbody>
    </table>`;
}

function renderSegmentHtml(segment: WarningLetterDocumentSegment): string {
  switch (segment.kind) {
    case "letterhead":
      return `<header class="letterhead"><p class="firmName">${escapeHtml(segment.firmName)}</p><p class="previewBanner" role="status">טיוטה לתצוגה בלבד — לא נשלחה</p></header>`;
    case "metaRow":
      return `<div class="metaRow"><span>${escapeHtml(segment.addressee)}</span><span>${escapeHtml(segment.dateAndReference)}</span></div>`;
    case "debtorName":
      return `<p class="debtorName">${escapeHtml(segment.text)}</p>`;
    case "address":
      return `<p class="address">${escapeHtml(segment.text).replace(/\n/g, "<br />")}</p>`;
    case "deliveryChannel":
      return `<p class="deliveryChannel"><u>${escapeHtml(segment.text)}</u></p>`;
    case "subject":
      return `<p class="subject"><strong>${escapeHtml(segment.text)}</strong></p>`;
    case "intro":
      return `<p class="intro">${escapeHtml(segment.text)}</p>`;
    case "clause":
      return `<p class="clause"><span class="clauseNumber">${segment.displayNumber}.</span> ${escapeHtml(segment.body)}</p>`;
    case "debtTable":
      return renderDebtTable(segment);
    case "paymentBlock":
      return `<div class="paymentBlock">${escapeHtml(segment.body).replace(/\n/g, "<br />")}</div>`;
    case "contact":
      return `<p class="contact">לבירורים נוספים, ניתן להתקשר לנייד: ${escapeHtml(segment.inquiriesMobileDisplay)}</p>`;
    case "signature":
      return `<footer class="signature"><p>בברכה,</p><p class="signaturePlaceholder">[מקום לחתימה וחותמת — לא ב-CP8.4B]</p><p>${escapeHtml(segment.signatoryName)}</p><p>${escapeHtml(segment.barRegistrationNumber)}</p></footer>`;
    case "evidence":
      return `<p class="evidence">${escapeHtml(segment.text)}</p>`;
    default:
      return "";
  }
}

export function renderWarningLetterPreviewHtml(snapshot: WarningLetterContentSnapshot): string {
  const segments = buildWarningLetterDocumentSegments(snapshot);
  const body = segments.map(renderSegmentHtml).join("\n");
  return `<article class="warningLetterDocument" dir="rtl" lang="he">\n${body}\n</article>`;
}
