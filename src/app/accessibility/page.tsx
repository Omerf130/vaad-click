import type { Metadata } from "next";

import { LegalDocumentBody } from "@/components/public/PublicLegalDocument/LegalDocumentBody";
import { PublicLegalDocumentPage } from "@/components/public/PublicLegalDocument/PublicLegalDocumentPage";
import { accessibilityStatementBody } from "@/content/legal/accessibility-statement.body";
import { legalDocuments } from "@/content/legal-pages";
import { buildPublicPageMetadata } from "@/shared/seo/build-public-page-metadata";

const document = legalDocuments.accessibility;

export const metadata: Metadata = buildPublicPageMetadata({
  title: `${accessibilityStatementBody.documentHeading} | ועד בקליק`,
  description: document.seoDescription,
  path: document.path,
});

export default function AccessibilityStatementPage() {
  return (
    <PublicLegalDocumentPage
      document={document}
      documentHeading={accessibilityStatementBody.documentHeading}
    >
      <LegalDocumentBody sections={accessibilityStatementBody.sections} />
    </PublicLegalDocumentPage>
  );
}
