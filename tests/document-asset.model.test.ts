import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

describe("document asset model (CP7)", () => {
  const source = readFileSync(
    join(process.cwd(), "src/modules/document-assets/infra/document-asset.model.ts"),
    "utf8",
  );

  it("declares building list and owner indexes", () => {
    expect(source).toMatch(/document_assets_building_list/);
    expect(source).toMatch(/document_assets_owner/);
    expect(source).toMatch(/document_assets_pending_upload_expiry/);
  });

  it("uses sparse unique storageKey", () => {
    expect(source).toMatch(/storageKey.*unique:\s*true/);
    expect(source).toMatch(/sparse:\s*true/);
  });
});
