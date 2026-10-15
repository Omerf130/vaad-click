import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

describe("BackToPublicHomeLink", () => {
  it("links to the public homepage without logout", () => {
    const source = readFileSync(
      join(process.cwd(), "src/components/navigation/BackToPublicHomeLink.tsx"),
      "utf8",
    );
    expect(source).toMatch(/href="\/"/);
    expect(source).not.toMatch(/logoutAction/);
    expect(source).toMatch(/חזרה לדף הבית/);
  });
});
