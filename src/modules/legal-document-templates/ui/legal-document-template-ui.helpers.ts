import type {
  LegalDocumentTemplateCategoryWorkspace,
  LegalDocumentTemplateRevisionView,
} from "@/modules/legal-document-templates/services/legal-document-template.service";

export type CategoryNavStatus = "no_draft" | "editing" | "approved" | "published";

export function revisionStatusLabelHe(status: string): string {
  switch (status) {
    case "draft":
      return "טיוטה פעילה";
    case "draft_superseded":
      return "טיוטה הוחלפה";
    case "published":
      return "פורסם";
    case "superseded":
      return "פורסם (הוחלף)";
    default:
      return status;
  }
}

export function resolveCategoryNavStatus(
  workspace: Pick<
    LegalDocumentTemplateCategoryWorkspace,
    "currentDraft" | "latestPublished"
  >,
): CategoryNavStatus {
  if (workspace.currentDraft) {
    if (workspace.currentDraft.approved) {
      return "approved";
    }
    return "editing";
  }
  if (
    workspace.latestPublished &&
    workspace.latestPublished.lifecycleStatus === "published"
  ) {
    return "published";
  }
  return "no_draft";
}

export function categoryNavStatusLabelHe(status: CategoryNavStatus): string {
  switch (status) {
    case "no_draft":
      return "אין טיוטה";
    case "editing":
      return "טיוטה בעריכה";
    case "approved":
      return "נוסח מאושר";
    case "published":
      return "פורסם";
  }
}

export function categoryNavStatusBadgeVariant(
  status: CategoryNavStatus,
): "neutral" | "info" | "warning" | "success" {
  switch (status) {
    case "no_draft":
      return "neutral";
    case "editing":
      return "info";
    case "approved":
      return "warning";
    case "published":
      return "success";
  }
}

/** Baseline text from server for the active editing session (not history view). */
export function resolveEditorBaselineText(workspace: LegalDocumentTemplateCategoryWorkspace): string {
  if (workspace.currentDraft) {
    return workspace.currentDraft.bodyText;
  }
  return workspace.latestPublished?.bodyText ?? "";
}

export function isLegalDocumentEditorDirty(
  baselineText: string,
  editorText: string,
): boolean {
  return editorText !== baselineText;
}

export function shouldBlockCategorySwitch(input: {
  isDirty: boolean;
  userConfirmedDiscard: boolean;
}): boolean {
  return input.isDirty && !input.userConfirmedDiscard;
}

export function formatRevisionDateTimeHe(iso: string | null | undefined): string | null {
  if (!iso) {
    return null;
  }
  return new Date(iso).toLocaleString("he-IL", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export function findRevisionInHistory(
  history: LegalDocumentTemplateRevisionView[],
  revisionId: string,
): LegalDocumentTemplateRevisionView | null {
  return history.find((row) => row.revisionId === revisionId) ?? null;
}
