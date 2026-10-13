import { describe, expect, it } from "vitest";

import { sanitizeMongoErrorMessage } from "@/shared/db/sanitize-mongo-error";

describe("sanitizeMongoErrorMessage", () => {
  it("redacts mongodb+srv URIs from error text", () => {
    const raw =
      "failed mongodb+srv://user:secret@cluster.example.net/mydb?retryWrites=true";
    expect(sanitizeMongoErrorMessage(raw)).not.toContain("secret");
    expect(sanitizeMongoErrorMessage(raw)).toContain("[redacted]");
  });
});
