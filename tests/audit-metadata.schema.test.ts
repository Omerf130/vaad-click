import { describe, expect, it } from "vitest";

import { auditMetadataSchema } from "@/shared/audit/validation/audit-metadata.schema";

describe("auditMetadataSchema", () => {
  it("accepts safe primitive metadata", () => {
    expect(
      auditMetadataSchema.parse({
        reasonCode: "invalid_credentials",
        attemptCount: 1,
      }),
    ).toEqual({
      reasonCode: "invalid_credentials",
      attemptCount: 1,
    });
  });

  it("rejects sensitive metadata keys", () => {
    expect(() =>
      auditMetadataSchema.parse({ passwordHash: "abc" }),
    ).toThrow();
  });

  it("rejects connection strings in values", () => {
    expect(() =>
      auditMetadataSchema.parse({
        note: "failed mongodb+srv://user:secret@cluster/db",
      }),
    ).toThrow();
  });
});
