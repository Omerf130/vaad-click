export function buildingLegalDocumentPdfUrls(input: {
  audience: "admin" | "portal";
  buildingId: string;
  documentId: string;
}): { inlineHref: string; downloadHref: string } {
  const base =
    input.audience === "admin"
      ? `/app/admin/buildings/${input.buildingId}/legal-documents/${input.documentId}/pdf`
      : `/app/buildings/${input.buildingId}/legal-documents/${input.documentId}/pdf`;

  return {
    inlineHref: base,
    downloadHref: `${base}?disposition=attachment`,
  };
}
