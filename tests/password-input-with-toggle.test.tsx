/** @vitest-environment jsdom */
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { PasswordInputWithToggle } from "@/components/auth/PasswordInputWithToggle";

describe("PasswordInputWithToggle", () => {
  it("toggles password visibility with accessible labels", () => {
    render(
      <PasswordInputWithToggle
        id="test-password"
        name="password"
        label="סיסמה"
        autoComplete="new-password"
      />,
    );

    const input = screen.getByLabelText("סיסמה") as HTMLInputElement;
    expect(input.type).toBe("password");

    fireEvent.click(screen.getByRole("button", { name: "הצג סיסמה" }));
    expect(input.type).toBe("text");
    expect(screen.getByRole("button", { name: "הסתר סיסמה" })).toBeTruthy();
  });

  it("supports independent toggles for two fields", () => {
    render(
      <>
        <PasswordInputWithToggle
          id="password-a"
          name="password"
          label="סיסמה"
          autoComplete="new-password"
        />
        <PasswordInputWithToggle
          id="password-b"
          name="confirmPassword"
          label="אימות סיסמה"
          autoComplete="new-password"
        />
      </>,
    );

    const primary = document.getElementById("password-a") as HTMLInputElement;
    const confirm = document.getElementById("password-b") as HTMLInputElement;

    fireEvent.click(screen.getAllByRole("button", { name: "הצג סיסמה" })[1]!);
    expect(primary.type).toBe("password");
    expect(confirm.type).toBe("text");
  });
});
