import type { Metadata } from "next";

import { PublicLegalDocumentPage } from "@/components/public/PublicLegalDocument/PublicLegalDocumentPage";
import { legalDocuments } from "@/content/legal-pages";
import { buildPublicPageMetadata } from "@/shared/seo/build-public-page-metadata";

const document = legalDocuments.terms;

export const metadata: Metadata = buildPublicPageMetadata({
  title: document.title,
  description: document.draftNoticeBody,
  path: document.path,
  noIndex: true,
});

export default function TermsOfUsePage() {
  return <PublicLegalDocumentPage document={document} />;
}
