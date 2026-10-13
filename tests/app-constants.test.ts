import { describe, expect, it } from "vitest";
import { APP_DISPLAY_NAME } from "@/shared/constants/app";

describe("app constants", () => {
  it("uses the temporary Hebrew product name", () => {
    expect(APP_DISPLAY_NAME).toBe("ועד בקליק");
  });
});
