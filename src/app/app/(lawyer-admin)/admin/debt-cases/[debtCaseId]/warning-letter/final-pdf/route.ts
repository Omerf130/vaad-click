import { getAuthenticatedContext } from "@/shared/auth/get-authenticated-context";
import {
  WarningLetterPdfError,
  WarningLetterPdfErrorCode,
} from "@/modules/warning-letters/pdf/warning-letter-pdf.errors";
import {
  parseWarningLetterFinalPdfDisposition,
  respondWithWarningLetterFinalPdf,
} from "@/modules/warning-letters/services/warning-letter-final-pdf-route.service";

export const runtime = "nodejs";
export const maxDuration = 60;
export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ debtCaseId: string }>;
};

function errorResponse(error: WarningLetterPdfError): Response {
  const status =
    error.code === WarningLetterPdfErrorCode.FORBIDDEN
      ? 403
      : error.code === WarningLetterPdfErrorCode.NOT_FOUND
        ? 404
        : error.code === WarningLetterPdfErrorCode.VALIDATION
          ? 400
          : error.code === WarningLetterPdfErrorCode.CHROMIUM_UNAVAILABLE
            ? 503
            : 500;
  return new Response(error.message, { status, headers: { "Cache-Control": "private, no-store" } });
}

export async function GET(request: Request, context: RouteContext): Promise<Response> {
  const { debtCaseId } = await context.params;
  const url = new URL(request.url);
  const finalDocumentId = url.searchParams.get("finalDocumentId")?.trim() ?? "";

  try {
    const sessionContext = await getAuthenticatedContext();
    if (!sessionContext) {
      return new Response("Unauthorized", { status: 401 });
    }
    const disposition = parseWarningLetterFinalPdfDisposition(url.searchParams);
    return await respondWithWarningLetterFinalPdf({
      context: sessionContext,
      debtCaseId,
      finalDocumentId,
      disposition,
    });
  } catch (error) {
    if (error instanceof WarningLetterPdfError) {
      return errorResponse(error);
    }
    throw error;
  }
}