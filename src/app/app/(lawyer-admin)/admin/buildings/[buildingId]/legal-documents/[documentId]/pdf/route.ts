import { getAuthenticatedContext } from "@/shared/auth/get-authenticated-context";
import {
  parseBuildingLegalDocumentPdfDisposition,
  respondWithBuildingLegalDocumentPdf,
} from "@/modules/building-legal-documents/services/building-legal-document-pdf-route.service";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ buildingId: string; documentId: string }>;
};

export async function GET(request: Request, context: RouteContext): Promise<Response> {
  const { buildingId, documentId } = await context.params;
  const sessionContext = await getAuthenticatedContext();
  const disposition = parseBuildingLegalDocumentPdfDisposition(new URL(request.url).searchParams);

  return respondWithBuildingLegalDocumentPdf({
    context: sessionContext,
    buildingId,
    documentId,
    disposition,
    audience: "lawyer_admin",
  });
}
