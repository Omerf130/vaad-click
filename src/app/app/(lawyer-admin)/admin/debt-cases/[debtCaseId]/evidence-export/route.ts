import { getAuthenticatedContext } from "@/shared/auth/get-authenticated-context";
import { resolveAuditCorrelationId } from "@/modules/audit/services/audit-correlation";
import {
  DebtCaseEvidenceExportError,
  DebtCaseEvidenceExportErrorCode,
} from "@/modules/debt-cases/domain/debt-case-evidence-export.errors";
import { buildDebtCaseEvidenceExportZip } from "@/modules/debt-cases/services/debt-case-evidence-export.service";
import { z } from "zod";

export const runtime = "nodejs";
export const maxDuration = 120;
export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ debtCaseId: string }>;
};

const bodySchema = z.object({
  orderedInventoryItemIds: z.array(z.string().min(3).max(120)).min(1).max(50),
});

function errorResponse(error: DebtCaseEvidenceExportError): Response {
  const status =
    error.code === DebtCaseEvidenceExportErrorCode.FORBIDDEN
      ? 403
      : error.code === DebtCaseEvidenceExportErrorCode.NOT_FOUND
        ? 404
        : error.code === DebtCaseEvidenceExportErrorCode.VALIDATION ||
            error.code === DebtCaseEvidenceExportErrorCode.DUPLICATE_SELECTION ||
            error.code === DebtCaseEvidenceExportErrorCode.CROSS_CASE ||
            error.code === DebtCaseEvidenceExportErrorCode.MISSING_FILE
          ? 400
          : error.code === DebtCaseEvidenceExportErrorCode.SIZE_LIMIT
            ? 413
            : 500;
  return new Response(error.messageHe ?? error.message, {
    status,
    headers: { "Cache-Control": "private, no-store" },
  });
}

export async function POST(request: Request, context: RouteContext): Promise<Response> {
  const { debtCaseId } = await context.params;

  try {
    const sessionContext = await getAuthenticatedContext();
    if (!sessionContext) {
      return new Response("Unauthorized", {
        status: 401,
        headers: { "Cache-Control": "private, no-store" },
      });
    }

    const json = await request.json();
    const parsed = bodySchema.safeParse(json);
    if (!parsed.success) {
      return new Response("Invalid export request", {
        status: 400,
        headers: { "Cache-Control": "private, no-store" },
      });
    }

    const correlationId = await resolveAuditCorrelationId();
    const { zip, filename } = await buildDebtCaseEvidenceExportZip({
      context: sessionContext,
      debtCaseId,
      orderedInventoryItemIds: parsed.data.orderedInventoryItemIds,
      correlationId,
    });

    const headers = new Headers();
    headers.set("Content-Type", "application/zip");
    headers.set("Content-Length", String(zip.length));
    headers.set("Cache-Control", "private, no-store");
    headers.set("X-Content-Type-Options", "nosniff");
    headers.set("Content-Disposition", `attachment; filename="${filename.replace(/"/g, "")}"`);

    return new Response(new Uint8Array(zip), { status: 200, headers });
  } catch (error) {
    if (error instanceof DebtCaseEvidenceExportError) {
      return errorResponse(error);
    }
    throw error;
  }
}