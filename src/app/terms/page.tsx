import type { Metadata } from "next";

import { LegalDocumentBody } from "@/components/public/PublicLegalDocument/LegalDocumentBody";
import { PublicLegalDocumentPage } from "@/components/public/PublicLegalDocument/PublicLegalDocumentPage";
import { termsOfUseBody } from "@/content/legal/terms-of-use.body";
import { legalDocuments } from "@/content/legal-pages";
import { buildPublicPageMetadata } from "@/shared/seo/build-public-page-metadata";

const document = legalDocuments.terms;

export const metadata: Metadata = buildPublicPageMetadata({
  title: `${termsOfUseBody.documentHeading} | ועד בקליק`,
  description: document.seoDescription,
  path: document.path,
});

export default function TermsOfUsePage() {
  return (
    <PublicLegalDocumentPage
      document={document}
      documentHeading={termsOfUseBody.documentHeading}
    >
      <LegalDocumentBody sections={termsOfUseBody.sections} />
    </PublicLegalDocumentPage>
  );
}
