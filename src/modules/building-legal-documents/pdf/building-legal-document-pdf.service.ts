import "server-only";

import pdfMake from "pdfmake";

import {
  BuildingLegalDocumentPdfError,
  BuildingLegalDocumentPdfErrorCode,
} from "@/modules/building-legal-documents/pdf/building-legal-document-pdf.errors";
import { buildBuildingLegalDocumentPdfDefinition } from "@/modules/building-legal-documents/pdf/building-legal-document-pdf.layout";
import {
  parseBuildingLegalDocumentPdfInput,
  type BuildingLegalDocumentPdfInput,
} from "@/modules/building-legal-documents/pdf/building-legal-document-pdf.schema";
import {
  getNotoSansHebrewPdfFontDescriptors,
  isAllowedHebrewPdfFontPath,
} from "@/modules/building-legal-documents/pdf/noto-sans-hebrew-font.loader";
import { LegalDocumentTemplateCategory } from "@/modules/legal-document-templates/domain/legal-document-template-category";
import type { BuildingLegalDocumentPreviewView } from "@/modules/building-legal-documents/services/building-legal-document.service";

let pdfMakeConfigured = false;

function ensurePdfMakeConfigured(): void {
  if (pdfMakeConfigured) {
    return;
  }

  pdfMake.setFonts(getNotoSansHebrewPdfFontDescriptors());
  pdfMake.setUrlAccessPolicy(() => false);
  pdfMake.setLocalAccessPolicy((filePath: string) => isAllowedHebrewPdfFontPath(filePath));
  pdfMakeConfigured = true;
}

export function buildingLegalDocumentPdfInputFromPreview(
  preview: Pick<
    BuildingLegalDocumentPreviewView,
    "titleHe" | "renderedContentSnapshot" | "category" | "createdAtIso" | "buildingLegalDocumentId"
  >,
): BuildingLegalDocumentPdfInput {
  return {
    titleHe: preview.titleHe,
    renderedContentSnapshot: preview.renderedContentSnapshot,
    category: preview.category,
    generatedAtIso: preview.createdAtIso,
    documentReferenceId: preview.buildingLegalDocumentId,
  };
}

export async function generateBuildingLegalDocumentPdfBuffer(input: unknown): Promise<Buffer> {
  const parsed = parseBuildingLegalDocumentPdfInput(input);
  ensurePdfMakeConfigured();

  try {
    const docDefinition = buildBuildingLegalDocumentPdfDefinition(parsed);
    const outputDocument = pdfMake.createPdf(docDefinition);
    const buffer = await outputDocument.getBuffer();
    if (!buffer || buffer.length === 0) {
      throw new BuildingLegalDocumentPdfError(
        BuildingLegalDocumentPdfErrorCode.GENERATION_FAILED,
        "PDF generation produced empty output.",
      );
    }
    return buffer;
  } catch (error) {
    if (error instanceof BuildingLegalDocumentPdfError) {
      throw error;
    }
    throw new BuildingLegalDocumentPdfError(
      BuildingLegalDocumentPdfErrorCode.GENERATION_FAILED,
      "PDF generation failed.",
    );
  }
}

/** Synthetic Hebrew/English sample for local visual inspection only. */
export const BUILDING_LEGAL_DOCUMENT_PDF_DEV_SAMPLE_INPUT: BuildingLegalDocumentPdfInput = {
  titleHe: "דוגמה לבדיקת PDF — לא מסמך משפטי",
  category: LegalDocumentTemplateCategory.DECLARATION,
  generatedAtIso: "2026-01-15T10:30:00.000Z",
  renderedContentSnapshot: [
    "זהו טקסט דוגמה בעברית עם מספרים 12345 ותאריך 29/10/2026.",
    "שורה שנייה עם English mixed text and RTL paragraph spacing.",
    "",
    "פסקה נוספת לאחר שורה ריקה.",
    "שורה ארוכה יותר שנועדה לבדוק שבירת שורות אוטומטית במסמך רב-עמודי כאשר התוכן חורג מרוחב העמוד בפורמט A4 עם שוליים סטנדרטיים.",
  ].join("\n"),
};
