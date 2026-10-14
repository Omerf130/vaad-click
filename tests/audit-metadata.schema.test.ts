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

  it("still rejects standalone pan metadata keys", () => {
    expect(() => auditMetadataSchema.parse({ pan: "4111111111111111" })).toThrow();
  });

  it("allows management company public ids in metadata keys", () => {
    expect(
      auditMetadataSchema.parse({
        managementCompanyId: "796bd154-2de9-46fa-b057-ec05f400f298",
      }),
    ).toEqual({
      managementCompanyId: "796bd154-2de9-46fa-b057-ec05f400f298",
    });
  });
});
