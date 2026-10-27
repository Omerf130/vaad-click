/** @vitest-environment jsdom */

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { PublicFooter } from "@/components/public/PublicFooter/PublicFooter";
import { legalDocumentList } from "@/content/legal-pages";
import { lawFirmIdentity } from "@/content/law-firm";

describe("PublicFooter", () => {
  it("renders law firm identity and legal document links", () => {
    render(<PublicFooter />);

    expect(screen.getByText(lawFirmIdentity.lawyerDisplayName)).toBeTruthy();

    for (const doc of legalDocumentList) {
      const link = screen.getByRole("link", { name: doc.title });
      expect(link.getAttribute("href")).toBe(doc.path);
    }
  });

  it("includes clickable email contact", () => {
    render(<PublicFooter />);
    const emailLink = screen.getAllByRole("link", { name: lawFirmIdentity.email })[0];
    expect(emailLink?.getAttribute("href")).toBe(`mailto:${lawFirmIdentity.email}`);
  });
});
