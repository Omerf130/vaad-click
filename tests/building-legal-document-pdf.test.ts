import { createHash } from "node:crypto";
import { writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { PDFParse } from "pdf-parse";
import { describe, expect, it, vi } from "vitest";

import {
  BuildingLegalDocumentPdfError,
  BuildingLegalDocumentPdfErrorCode,
} from "@/modules/building-legal-documents/pdf/building-legal-document-pdf.errors";
import {
  BUILDING_LEGAL_DOCUMENT_PDF_DEV_SAMPLE_INPUT,
  generateBuildingLegalDocumentPdfBuffer,
} from "@/modules/building-legal-documents/pdf/building-legal-document-pdf.service";
import { LegalDocumentTemplateCategory } from "@/modules/legal-document-templates/domain/legal-document-template-category";

const mockConnectMongo = vi.fn();
const mockTemplateResolve = vi.fn();

vi.mock("@/shared/db/connect", () => ({
  connectMongo: (...args: unknown[]) => mockConnectMongo(...args),
}));

vi.mock(
  "@/modules/legal-document-templates/services/approved-published-legal-template.service",
  () => ({
    resolveApprovedPublishedLegalTemplateRevision: (...args: unknown[]) =>
      mockTemplateResolve(...args),
  }),
);

function baseInput(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    titleHe: "כותרת בדיקה",
    category: LegalDocumentTemplateCategory.DECLARATION,
    generatedAtIso: "2026-03-01T12:00:00.000Z",
    renderedContentSnapshot: "טקסט עברית 123 ו-English.",
    ...overrides,
  };
}

async function extractPdfText(buffer: Buffer): Promise<string> {
  const parser = new PDFParse({ data: buffer });
  const result = await parser.getText();
  await parser.destroy();
  return result.text;
}

describe("building legal document PDF generation", () => {
  it("produces a non-empty PDF with a valid signature", async () => {
    const buffer = await generateBuildingLegalDocumentPdfBuffer(baseInput());
    expect(buffer.subarray(0, 5).toString("ascii")).toBe("%PDF-");
    expect(buffer.length).toBeGreaterThan(500);
  });

  it("embeds Hebrew and mixed content extractable from the PDF", async () => {
    const snapshot = "שלום עולם · מספר 42 · English side note";
    const buffer = await generateBuildingLegalDocumentPdfBuffer(
      baseInput({ renderedContentSnapshot: snapshot }),
    );
    const text = await extractPdfText(buffer);
    expect(text).toMatch(/42/);
    expect(text.replace(/\s+/g, " ")).toMatch(/English/);
    expect(text.replace(/\s+/g, " ")).toMatch(/שלום|עולם/u);
  });

  it("renders multiple paragraphs and long multipage content", async () => {
    const paragraph = "פסקת בדיקה עם תוכן בעברית ומספרים 999.\n";
    const longSnapshot = `${paragraph}\n${paragraph.repeat(80)}`;
    const buffer = await generateBuildingLegalDocumentPdfBuffer(
      baseInput({ renderedContentSnapshot: longSnapshot }),
    );
    const text = await extractPdfText(buffer);
    expect(text).toMatch(/999/);
    expect(text.length).toBeGreaterThan(200);
  });

  it("uses the provided snapshot only (template resolver is never invoked)", async () => {
    const marker = `SNAPSHOT_ONLY_${createHash("sha256").update("cp17a").digest("hex").slice(0, 12)}`;
    const buffer = await generateBuildingLegalDocumentPdfBuffer(
      baseInput({ renderedContentSnapshot: marker }),
    );
    const text = await extractPdfText(buffer);
    expect(text).toContain(marker);
    expect(mockTemplateResolve).not.toHaveBeenCalled();
    expect(mockConnectMongo).not.toHaveBeenCalled();
  });

  it("accepts empty snapshot and invalid input safely", async () => {
    const emptyBuffer = await generateBuildingLegalDocumentPdfBuffer(
      baseInput({ renderedContentSnapshot: "" }),
    );
    expect(emptyBuffer.subarray(0, 5).toString("ascii")).toBe("%PDF-");

    await expect(generateBuildingLegalDocumentPdfBuffer(null)).rejects.toMatchObject({
      code: BuildingLegalDocumentPdfErrorCode.INVALID_INPUT,
    });
    await expect(
      generateBuildingLegalDocumentPdfBuffer(baseInput({ titleHe: "   " })),
    ).rejects.toBeInstanceOf(BuildingLegalDocumentPdfError);
  });

  it("does not expose document text in generation error messages", async () => {
    const secret = "סוד שלא אמור להופיע בשגיאה";
    try {
      await generateBuildingLegalDocumentPdfBuffer({
        ...baseInput({ renderedContentSnapshot: secret }),
        category: "not_a_category",
      });
      expect.fail("expected invalid category to fail");
    } catch (error) {
      expect(error).toBeInstanceOf(BuildingLegalDocumentPdfError);
      expect(String(error)).not.toContain(secret);
    }
  });

  it("writes a dev sample PDF when VAAD_DEV_SAMPLE_PDF=1", async () => {
    if (process.env.VAAD_DEV_SAMPLE_PDF !== "1") {
      return;
    }
    const buffer = await generateBuildingLegalDocumentPdfBuffer(
      BUILDING_LEGAL_DOCUMENT_PDF_DEV_SAMPLE_INPUT,
    );
    const outPath = join(tmpdir(), "vaad-click-dev-sample-legal-document.pdf");
    writeFileSync(outPath, buffer);
    console.log(`Sample PDF written to: ${outPath}`);
    expect(buffer.subarray(0, 5).toString("ascii")).toBe("%PDF-");
  });
});
