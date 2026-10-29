import { legalDocumentTemplateCategoryLabelHe } from "@/modules/legal-document-templates/domain/legal-document-template-category";

import type { BuildingLegalDocumentPdfInput } from "@/modules/building-legal-documents/pdf/building-legal-document-pdf.schema";
import { getNotoSansHebrewPdfFontFamily } from "@/modules/building-legal-documents/pdf/noto-sans-hebrew-font.loader";

/** pdfmake document definition (layout only — content comes from the snapshot). */
export type BuildingLegalDocumentPdfDefinition = {
  pageSize: "A4";
  pageMargins: [number, number, number, number];
  defaultStyle: {
    font: string;
    fontSize: number;
    alignment: "right";
    lineHeight: number;
  };
  info: {
    title: string;
    author: string;
    creator: string;
    producer: string;
    creationDate: Date;
  };
  content: unknown[];
  footer: (currentPage: number, pageCount: number) => unknown;
  styles: Record<string, unknown>;
};

const PDF_CREATOR = "VaadClick";
const EMPTY_SNAPSHOT_PLACEHOLDER_HE = "(ריק)";

function formatMetadataDateHe(iso: string): string {
  return new Date(iso).toLocaleString("he-IL", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function snapshotToBodyContent(snapshot: string): unknown[] {
  if (snapshot.length === 0) {
    return [{ text: EMPTY_SNAPSHOT_PLACEHOLDER_HE, style: "body" }];
  }

  const blocks: unknown[] = [];
  const paragraphs = snapshot.split(/\n\n/);

  for (const paragraph of paragraphs) {
    const lines = paragraph.split("\n");
    for (let lineIndex = 0; lineIndex < lines.length; lineIndex += 1) {
      const isFirstLine = lineIndex === 0;
      const isLastLine = lineIndex === lines.length - 1;
      blocks.push({
        text: lines[lineIndex] ?? "",
        style: "body",
        margin: [0, isFirstLine ? 0 : 2, 0, isLastLine ? 10 : 0],
      });
    }
  }

  return blocks;
}

export function buildBuildingLegalDocumentPdfDefinition(
  input: BuildingLegalDocumentPdfInput,
): BuildingLegalDocumentPdfDefinition {
  const font = getNotoSansHebrewPdfFontFamily();
  const generatedAtIso = input.generatedAtIso ?? "1970-01-01T00:00:00.000Z";
  const categoryLabel = legalDocumentTemplateCategoryLabelHe(input.category);

  const metaLine = `קטגוריה: ${categoryLabel} · תאריך הפקה: ${formatMetadataDateHe(generatedAtIso)}`;

  return {
    pageSize: "A4",
    pageMargins: [56, 72, 56, 72],
    defaultStyle: {
      font,
      fontSize: 11,
      alignment: "right",
      lineHeight: 1.35,
    },
    info: {
      title: input.titleHe,
      author: PDF_CREATOR,
      creator: PDF_CREATOR,
      producer: PDF_CREATOR,
      creationDate: new Date(generatedAtIso),
    },
    content: [
      { text: input.titleHe, style: "title" },
      { text: metaLine, style: "meta", margin: [0, 0, 0, 16] },
      ...snapshotToBodyContent(input.renderedContentSnapshot),
    ],
    footer(currentPage, pageCount) {
      return {
        text: `עמוד ${currentPage} מתוך ${pageCount}`,
        alignment: "center",
        font,
        fontSize: 9,
        margin: [0, 8, 0, 0],
        color: "#444444",
      };
    },
    styles: {
      title: {
        font,
        fontSize: 16,
        bold: true,
        alignment: "right",
        margin: [0, 0, 0, 8],
      },
      meta: {
        font,
        fontSize: 9,
        alignment: "right",
        color: "#555555",
      },
      body: {
        font,
        fontSize: 11,
        alignment: "right",
      },
    },
  };
}
