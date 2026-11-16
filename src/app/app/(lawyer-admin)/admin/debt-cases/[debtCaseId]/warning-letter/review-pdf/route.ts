import { getAuthenticatedContext } from "@/shared/auth/get-authenticated-context";
import {
  parseWarningLetterReviewPdfDisposition,
  respondWithWarningLetterReviewPdf,
} from "@/modules/warning-letters/services/warning-letter-review-pdf-route.service";
import {
  WarningLetterPdfError,
  WarningLetterPdfErrorCode,
} from "@/modules/warning-letters/pdf/warning-letter-pdf.errors";

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
  const draftId = url.searchParams.get("draftId")?.trim() ?? "";

  try {
    const sessionContext = await getAuthenticatedContext();
    if (!sessionContext) {
      return new Response("Unauthorized", { status: 401 });
    }
    const disposition = parseWarningLetterReviewPdfDisposition(url.searchParams);
    return await respondWithWarningLetterReviewPdf({
      context: sessionContext,
      debtCaseId,
      draftId,
      disposition,
    });
  } catch (error) {
    if (error instanceof WarningLetterPdfError) {
      return errorResponse(error);
    }
    throw error;
  }
}