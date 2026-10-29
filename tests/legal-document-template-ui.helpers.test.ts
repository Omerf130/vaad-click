import { describe, expect, it } from "vitest";

import { LegalDocumentTemplateCategory } from "@/modules/legal-document-templates/domain/legal-document-template-category";
import {
  categoryNavStatusLabelHe,
  findRevisionInHistory,
  isLegalDocumentEditorDirty,
  resolveCategoryNavStatus,
  resolveEditorBaselineText,
  shouldBlockCategorySwitch,
} from "@/modules/legal-document-templates/ui/legal-document-template-ui.helpers";
import type {
  LegalDocumentTemplateCategoryWorkspace,
  LegalDocumentTemplateRevisionView,
} from "@/modules/legal-document-templates/services/legal-document-template.service";

function revision(partial: Partial<LegalDocumentTemplateRevisionView> & { revisionId: string }): LegalDocumentTemplateRevisionView {
  return {
    revisionNumber: 1,
    bodyText: "",
    contentSha256: "a".repeat(64),
    lifecycleStatus: "draft",
    isCurrentDraft: true,
    createdAtIso: "2026-01-01T10:00:00.000Z",
    publishedAtIso: null,
    approved: false,
    approvedAtIso: null,
    ...partial,
  };
}

function workspace(
  partial: Partial<LegalDocumentTemplateCategoryWorkspace>,
): LegalDocumentTemplateCategoryWorkspace {
  return {
    category: LegalDocumentTemplateCategory.POWER_OF_ATTORNEY,
    titleHe: "ייפוי כוח",
    templateId: "tpl-1",
    currentDraft: null,
    latestPublished: null,
    revisionHistory: [],
    ...partial,
  };
}

describe("legal document template UI helpers", () => {
  it("detects unsaved editor changes against server baseline", () => {
    expect(isLegalDocumentEditorDirty("א", "א")).toBe(false);
    expect(isLegalDocumentEditorDirty("א", "ב")).toBe(true);
  });

  it("blocks category switch when dirty and user did not confirm", () => {
    expect(
      shouldBlockCategorySwitch({ isDirty: true, userConfirmedDiscard: false }),
    ).toBe(true);
    expect(
      shouldBlockCategorySwitch({ isDirty: true, userConfirmedDiscard: true }),
    ).toBe(false);
    expect(
      shouldBlockCategorySwitch({ isDirty: false, userConfirmedDiscard: false }),
    ).toBe(false);
  });

  it("resolves category nav status labels", () => {
    expect(
      categoryNavStatusLabelHe(
        resolveCategoryNavStatus(
          workspace({
            currentDraft: revision({ revisionId: "d1", approved: false }),
          }),
        ),
      ),
    ).toBe("טיוטה בעריכה");

    expect(
      categoryNavStatusLabelHe(
        resolveCategoryNavStatus(
          workspace({
            currentDraft: revision({ revisionId: "d2", approved: true }),
          }),
        ),
      ),
    ).toBe("נוסח מאושר");

    expect(
      categoryNavStatusLabelHe(
        resolveCategoryNavStatus(
          workspace({
            latestPublished: revision({
              revisionId: "p1",
              lifecycleStatus: "published",
            }),
          }),
        ),
      ),
    ).toBe("פורסם");
  });

  it("uses active draft body as editor baseline when draft exists", () => {
    const ws = workspace({
      currentDraft: revision({ revisionId: "d1", bodyText: "טיוטה" }),
      latestPublished: revision({
        revisionId: "p1",
        bodyText: "פרסום",
        lifecycleStatus: "published",
      }),
    });
    expect(resolveEditorBaselineText(ws)).toBe("טיוטה");
  });

  it("finds historical revision for read-only view without mutating draft", () => {
    const old = revision({
      revisionId: "old",
      revisionNumber: 2,
      bodyText: "גרסה ישנה",
      lifecycleStatus: "draft_superseded",
      isCurrentDraft: false,
    });
    const current = revision({
      revisionId: "cur",
      revisionNumber: 3,
      bodyText: "טיוטה נוכחית",
    });
    const ws = workspace({
      currentDraft: current,
      revisionHistory: [current, old],
    });
    const viewed = findRevisionInHistory(ws.revisionHistory, "old");
    expect(viewed?.bodyText).toBe("גרסה ישנה");
    expect(ws.currentDraft?.bodyText).toBe("טיוטה נוכחית");
  });
});
