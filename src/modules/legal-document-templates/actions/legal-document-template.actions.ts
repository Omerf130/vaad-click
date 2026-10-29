"use server";

import { revalidatePath } from "next/cache";

import { resolveAuditCorrelationId } from "@/modules/audit/services/audit-correlation";
import { LegalDocumentTemplateError } from "@/modules/legal-document-templates/domain/legal-document-template-errors";
import { formatLegalDocumentTemplateErrorHe } from "@/modules/legal-document-templates/presentation/legal-document-template-messages.he";
import {
  approveLegalDocumentTemplateRevision,
  createLegalDocumentTemplateDraft,
  publishLegalDocumentTemplateRevision,
  saveLegalDocumentTemplateDraftRevision,
} from "@/modules/legal-document-templates/services/legal-document-template.service";
import {
  createLegalDocumentTemplateDraftSchema,
  legalDocumentTemplateRevisionIdSchema,
  saveLegalDocumentTemplateDraftSchema,
} from "@/modules/legal-document-templates/validation/legal-document-template.schema";
import { requireLawyerAdminPortal } from "@/shared/auth/require-access";
import { assertSameOriginMutationRequest } from "@/shared/security/request-origin";

export type LegalDocumentTemplateActionState = {
  ok: boolean;
  message?: string;
};

const ADMIN_PATH = "/app/admin/legal-document-templates";

function mapError(error: unknown, fallbackHe: string): LegalDocumentTemplateActionState {
  if (error instanceof LegalDocumentTemplateError) {
    return { ok: false, message: formatLegalDocumentTemplateErrorHe(error.code) };
  }
  if (error instanceof Error && error.message === "Cross-origin request rejected") {
    return { ok: false, message: "הבקשה נדחתה." };
  }
  return { ok: false, message: fallbackHe };
}

export async function createLegalDocumentTemplateDraftFormAction(
  _prev: LegalDocumentTemplateActionState,
  formData: FormData,
): Promise<LegalDocumentTemplateActionState> {
  try {
    await assertSameOriginMutationRequest();
    const context = await requireLawyerAdminPortal();
    const parsed = createLegalDocumentTemplateDraftSchema.safeParse({
      category: String(formData.get("category") ?? "").trim(),
      useDevPlaceholder: formData.get("useDevPlaceholder") === "1",
    });
    if (!parsed.success) {
      return { ok: false, message: "קטגוריית מסמך לא תקינה." };
    }
    const correlationId = await resolveAuditCorrelationId();
    await createLegalDocumentTemplateDraft({
      context,
      category: parsed.data.category,
      useDevPlaceholder: parsed.data.useDevPlaceholder,
      correlationId,
    });
    revalidatePath(ADMIN_PATH);
    return { ok: true, message: "טיוטה חדשה נוצרה." };
  } catch (error) {
    return mapError(error, "לא ניתן ליצור טיוטה.");
  }
}

export async function saveLegalDocumentTemplateDraftFormAction(
  _prev: LegalDocumentTemplateActionState,
  formData: FormData,
): Promise<LegalDocumentTemplateActionState> {
  try {
    await assertSameOriginMutationRequest();
    const context = await requireLawyerAdminPortal();
    const parsed = saveLegalDocumentTemplateDraftSchema.safeParse({
      category: String(formData.get("category") ?? "").trim(),
      bodyText: String(formData.get("bodyText") ?? ""),
    });
    if (!parsed.success) {
      return { ok: false, message: "נתוני הטיוטה אינם תקינים." };
    }
    const correlationId = await resolveAuditCorrelationId();
    const result = await saveLegalDocumentTemplateDraftRevision({
      context,
      category: parsed.data.category,
      bodyText: parsed.data.bodyText,
      correlationId,
    });
    revalidatePath(ADMIN_PATH);
    return {
      ok: true,
      message: `גרסת טיוטה ${result.revisionNumber} נשמרה.`,
    };
  } catch (error) {
    return mapError(error, "לא ניתן לשמור את הטיוטה.");
  }
}

export async function approveLegalDocumentTemplateRevisionFormAction(
  _prev: LegalDocumentTemplateActionState,
  formData: FormData,
): Promise<LegalDocumentTemplateActionState> {
  try {
    await assertSameOriginMutationRequest();
    const context = await requireLawyerAdminPortal();
    const revisionIdParsed = legalDocumentTemplateRevisionIdSchema.safeParse(
      String(formData.get("revisionId") ?? "").trim(),
    );
    if (!revisionIdParsed.success) {
      return { ok: false, message: "מזהה גרסה חסר." };
    }
    const correlationId = await resolveAuditCorrelationId();
    const result = await approveLegalDocumentTemplateRevision({
      context,
      revisionId: revisionIdParsed.data,
      correlationId,
    });
    revalidatePath(ADMIN_PATH);
    return {
      ok: true,
      message: result.alreadyApproved
        ? "הניסוח כבר אושר לגרסה זו."
        : "הניסוח המדויק אושר ונרשם בביקורת.",
    };
  } catch (error) {
    return mapError(error, "לא ניתן לאשר את הניסוח.");
  }
}

export async function publishLegalDocumentTemplateRevisionFormAction(
  _prev: LegalDocumentTemplateActionState,
  formData: FormData,
): Promise<LegalDocumentTemplateActionState> {
  try {
    await assertSameOriginMutationRequest();
    const context = await requireLawyerAdminPortal();
    const revisionIdParsed = legalDocumentTemplateRevisionIdSchema.safeParse(
      String(formData.get("revisionId") ?? "").trim(),
    );
    if (!revisionIdParsed.success) {
      return { ok: false, message: "מזהה גרסה חסר." };
    }
    const correlationId = await resolveAuditCorrelationId();
    await publishLegalDocumentTemplateRevision({
      context,
      revisionId: revisionIdParsed.data,
      correlationId,
    });
    revalidatePath(ADMIN_PATH);
    return { ok: true, message: "הגרסה פורסמה ונשמרה להיסטוריה." };
  } catch (error) {
    return mapError(error, "לא ניתן לפרסם את הגרסה.");
  }
}
