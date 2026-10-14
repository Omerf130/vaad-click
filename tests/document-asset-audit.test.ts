import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

describe("document asset audit boundaries", () => {
  const source = readFileSync(
    join(process.cwd(), "src/modules/document-assets/services/document-asset-audit.service.ts"),
    "utf8",
  );

  it("does not reference original filenames or storage credentials in metadata helpers", () => {
    expect(source).not.toMatch(/originalFilename/);
    expect(source).not.toMatch(/signedUrl/);
    expect(source).not.toMatch(/storageKey/);
    expect(source).toMatch(/safeDocumentMetadata/);
  });

  it("uses mandatory audit writer for upload rejected without session", () => {
    expect(source).toMatch(/LEGAL_DOCUMENT_ASSET_UPLOAD_REJECTED/);
    expect(source).toMatch(/mandatory:\s*true/);
  });
});
