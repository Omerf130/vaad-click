import { describe, expect, it } from "vitest";

import { buildEvidenceZipArchive } from "@/modules/debt-cases/domain/build-evidence-zip-archive";
import {
  DEBT_CASE_EVIDENCE_EXPORT_MAX_FILES,
} from "@/modules/debt-cases/domain/debt-case-evidence-export.constants";
import {
  DebtCaseEvidenceExportError,
  DebtCaseEvidenceExportErrorCode,
} from "@/modules/debt-cases/domain/debt-case-evidence-export.errors";
import {
  buildEvidenceInventoryItemId,
  DebtCaseEvidenceInventoryItemKind,
  parseEvidenceInventoryItemId,
} from "@/modules/debt-cases/domain/debt-case-evidence-inventory.types";
import { formatHebrewExhibitLabel } from "@/modules/debt-cases/domain/debt-case-exhibit-labels.he";
import { safeExportZipEntryName } from "@/modules/debt-cases/domain/safe-export-filename";

describe("exhibit labels", () => {
  it("uses Hebrew appendix labels in order", () => {
    expect(formatHebrewExhibitLabel(0)).toBe("נספח א׳");
    expect(formatHebrewExhibitLabel(1)).toBe("נספח ב׳");
    expect(formatHebrewExhibitLabel(2)).toBe("נספח ג׳");
  });
});

describe("inventory item ids", () => {
  it("round-trips typed ids", () => {
    const id = buildEvidenceInventoryItemId(
      DebtCaseEvidenceInventoryItemKind.DOCUMENT_ASSET,
      "550e8400-e29b-41d4-a716-446655440000",
    );
    const parsed = parseEvidenceInventoryItemId(id);
    expect(parsed?.kind).toBe(DebtCaseEvidenceInventoryItemKind.DOCUMENT_ASSET);
    expect(parsed?.sourceRefId).toContain("550e8400");
  });
});

describe("safe export filenames", () => {
  it("strips traversal and unsafe chars", () => {
    const name = safeExportZipEntryName({
      exhibitLabel: "נספח א׳",
      suggestedBase: "../../etc/passwd",
      extension: "pdf",
    });
    expect(name).not.toContain("..");
    expect(name).not.toContain("/");
    expect(name.endsWith(".pdf")).toBe(true);
  });
});

describe("zip archive integrity", () => {
  it("builds a non-empty zip with manifest", async () => {
    const zip = await buildEvidenceZipArchive([
      { path: "files/test.txt", data: Buffer.from("hello", "utf8") },
      { path: "manifest.he.txt", data: Buffer.from("test", "utf8") },
    ]);
    expect(zip.length).toBeGreaterThan(50);
    expect(zip.subarray(0, 2).toString("utf8")).toBe("PK");
  });

  it("rejects unsafe paths", async () => {
    await expect(
      buildEvidenceZipArchive([{ path: "../evil.txt", data: Buffer.from("x") }]),
    ).rejects.toThrow();
  });
});

describe("export limits", () => {
  it("documents max file cap", () => {
    expect(DEBT_CASE_EVIDENCE_EXPORT_MAX_FILES).toBe(50);
  });

  it("duplicate selection error type exists", () => {
    const err = new DebtCaseEvidenceExportError(
      DebtCaseEvidenceExportErrorCode.DUPLICATE_SELECTION,
      "dup",
      "כפילות",
    );
    expect(err.code).toBe(DebtCaseEvidenceExportErrorCode.DUPLICATE_SELECTION);
  });
});

describe("portal isolation", () => {
  it("operator workspace has no evidence export panel", async () => {
    const { readFileSync } = await import("node:fs");
    const { join } = await import("node:path");
    const operator = readFileSync(
      join(process.cwd(), "src/modules/debt-cases/ui/OperatorDebtCaseWorkspace.tsx"),
      "utf8",
    );
    expect(operator).not.toMatch(/DebtCaseEvidenceExport/);
  });
});