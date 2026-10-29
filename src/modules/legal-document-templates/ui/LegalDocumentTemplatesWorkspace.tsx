"use client";

import type { FormEvent } from "react";
import { useActionState, useCallback, useMemo, useState } from "react";

import { Button } from "@/components/ui/Button/Button";
import { StatusBadge } from "@/components/ui/StatusBadge/StatusBadge";
import {
  approveLegalDocumentTemplateRevisionFormAction,
  createLegalDocumentTemplateDraftFormAction,
  publishLegalDocumentTemplateRevisionFormAction,
  saveLegalDocumentTemplateDraftFormAction,
  type LegalDocumentTemplateActionState,
} from "@/modules/legal-document-templates/actions/legal-document-template.actions";
import type { LegalDocumentTemplateCategory } from "@/modules/legal-document-templates/domain/legal-document-template-category";
import type {
  LegalDocumentTemplateCategoryWorkspace,
  LegalDocumentTemplateRevisionView,
} from "@/modules/legal-document-templates/services/legal-document-template.service";
import {
  categoryNavStatusBadgeVariant,
  categoryNavStatusLabelHe,
  findRevisionInHistory,
  formatRevisionDateTimeHe,
  isLegalDocumentEditorDirty,
  resolveCategoryNavStatus,
  resolveEditorBaselineText,
  revisionStatusLabelHe,
  shouldBlockCategorySwitch,
} from "@/modules/legal-document-templates/ui/legal-document-template-ui.helpers";
import styles from "@/modules/legal-document-templates/ui/LegalDocumentTemplatesWorkspace.module.scss";

type Props = {
  categories: LegalDocumentTemplateCategoryWorkspace[];
};

const initialState: LegalDocumentTemplateActionState = { ok: false };

const DISCARD_SWITCH_MESSAGE =
  "יש שינויים שלא נשמרו. לעבור למסמך אחר בכל זאת? השינויים יאבדו מהמסך.";

const APPROVE_CONFIRM_MESSAGE =
  "לאשר את הניסוח המוצג בדיוק כפי שהוא? הפעולה נרשמת בביקורת ואינה מפרסמת את המסמך.";

const PUBLISH_CONFIRM_MESSAGE =
  "לפרסם את הגרסה המאושרת? גרסה שפורסמה אינה ניתנת לעריכה — לשינוי נדרשת טיוטה חדשה.";

function ActionFeedback({
  state,
}: {
  state: LegalDocumentTemplateActionState;
}) {
  if (!state.message) {
    return null;
  }
  return (
    <p
      className={state.ok ? styles.feedbackSuccess : styles.feedbackError}
      role="status"
      aria-live="polite"
    >
      {state.message}
    </p>
  );
}

function TechnicalDetails({
  label,
  contentSha256,
  revisionId,
}: {
  label: string;
  contentSha256: string;
  revisionId: string;
}) {
  return (
    <details className={styles.techDetails}>
      <summary className={styles.techSummary}>פרטים טכניים — {label}</summary>
      <p className={styles.techHash}>
        revisionId: {revisionId}
        {"\n"}
        SHA-256: {contentSha256}
      </p>
    </details>
  );
}

function CategoryDocumentWorkspace({
  workspace,
  onDirtyChange,
}: {
  workspace: LegalDocumentTemplateCategoryWorkspace;
  onDirtyChange: (category: LegalDocumentTemplateCategory, isDirty: boolean) => void;
}) {
  const draft = workspace.currentDraft;
  const baselineText = resolveEditorBaselineText(workspace);
  const [bodyText, setBodyText] = useState(baselineText);
  const [historyViewRevisionId, setHistoryViewRevisionId] = useState<string | null>(null);

  const isDirty = isLegalDocumentEditorDirty(baselineText, bodyText);
  const isHistoryView = historyViewRevisionId != null;

  const handleEditorChange = (nextText: string) => {
    setBodyText(nextText);
    onDirtyChange(
      workspace.category,
      isLegalDocumentEditorDirty(baselineText, nextText),
    );
  };
  const historyRevision = isHistoryView
    ? findRevisionInHistory(workspace.revisionHistory, historyViewRevisionId)
    : null;

  const [createState, createDraftAction, createPending] = useActionState(
    createLegalDocumentTemplateDraftFormAction,
    initialState,
  );
  const [saveState, saveDraftAction, savePending] = useActionState(
    saveLegalDocumentTemplateDraftFormAction,
    initialState,
  );
  const [approveState, approveAction, approvePending] = useActionState(
    approveLegalDocumentTemplateRevisionFormAction,
    initialState,
  );
  const [publishState, publishAction, publishPending] = useActionState(
    publishLegalDocumentTemplateRevisionFormAction,
    initialState,
  );

  const approvalPreviewText = draft?.bodyText ?? "";
  const canApproveOrPublish = Boolean(draft) && !isDirty && !isHistoryView;
  const publishBlockedReason = !draft
    ? "אין טיוטה פעילה."
    : isDirty
      ? "יש שינויים שלא נשמרו — שמרו את הטיוטה לפני אישור או פרסום."
      : isHistoryView
        ? "צפייה בגרסה היסטורית — חזרו לטיוטה הפעילה."
        : !draft.approved
          ? "פרסום ייפתח רק לאחר אישור מפורש של הניסוח השמור."
          : null;

  const lastSavedLabel = useMemo(() => {
    if (draft) {
      return formatRevisionDateTimeHe(draft.createdAtIso);
    }
    return null;
  }, [draft]);

  const handleSaveSubmit = (event: FormEvent<HTMLFormElement>) => {
    if (isHistoryView) {
      event.preventDefault();
      return;
    }
  };

  const handleApproveSubmit = (event: FormEvent<HTMLFormElement>) => {
    if (!canApproveOrPublish) {
      event.preventDefault();
      return;
    }
    if (!window.confirm(APPROVE_CONFIRM_MESSAGE)) {
      event.preventDefault();
    }
  };

  const handlePublishSubmit = (event: FormEvent<HTMLFormElement>) => {
    if (!canApproveOrPublish || !draft?.approved) {
      event.preventDefault();
      return;
    }
    if (!window.confirm(PUBLISH_CONFIRM_MESSAGE)) {
      event.preventDefault();
    }
  };

  const openHistoryView = useCallback((revisionId: string) => {
    setHistoryViewRevisionId(revisionId);
  }, []);

  const exitHistoryView = useCallback(() => {
    setHistoryViewRevisionId(null);
  }, []);

  return (
    <div className={styles.documentShell}>
      <div className={styles.mainPanel}>
        <article className={styles.panelCard} aria-labelledby="ldt-doc-title">
          <header className={styles.panelHeader}>
            <div>
              <h2 id="ldt-doc-title" className={styles.documentTitle}>
                {workspace.titleHe}
              </h2>
              <p className={styles.metaLine}>
                {draft
                  ? `טיוטה פעילה — גרסה ${draft.revisionNumber}`
                  : "אין טיוטה פעילה כרגע"}
              </p>
            </div>
            {draft ? (
              <StatusBadge
                label={draft.approved ? "מאושר — טרם פורסם" : "בעריכה"}
                variant={draft.approved ? "warning" : "info"}
              />
            ) : null}
          </header>

          <ActionFeedback state={createState} />

          {isHistoryView && historyRevision ? (
            <>
              <p className={styles.readOnlyBanner} role="status">
                צפייה בגרסה {historyRevision.revisionNumber} (
                {revisionStatusLabelHe(historyRevision.lifecycleStatus)}) — לקריאה בלבד. אין
                שינוי לטיוטה הפעילה.
              </p>
              <div className={styles.previewBox} dir="rtl">
                {historyRevision.bodyText || "(ריק)"}
              </div>
              <TechnicalDetails
                label={`גרסה ${historyRevision.revisionNumber}`}
                contentSha256={historyRevision.contentSha256}
                revisionId={historyRevision.revisionId}
              />
              <Button type="button" variant="secondary" size="sm" onClick={exitHistoryView}>
                חזרה לטיוטה הפעילה
              </Button>
            </>
          ) : !draft ? (
            <div className={styles.emptyState}>
              <h3 className={styles.emptyTitle}>אין טיוטה למסמך זה</h3>
              <p className={styles.emptyText}>
                צרו טיוטה ריקה והתחילו להזין ניסוח, או המשיכו מגרסה שפורסמה (אם קיימת) באמצעות
                שמירת טיוטה חדשה.
              </p>
              <div className={styles.emptyActions}>
                <form action={createDraftAction} className={styles.inlineForm}>
                  <input type="hidden" name="category" value={workspace.category} />
                  <Button type="submit" variant="primary" size="md" disabled={createPending}>
                    יצירת טיוטה ריקה
                  </Button>
                </form>
                <form action={createDraftAction} className={styles.inlineForm}>
                  <input type="hidden" name="category" value={workspace.category} />
                  <input type="hidden" name="useDevPlaceholder" value="1" />
                  <Button type="submit" variant="ghost" size="sm" disabled={createPending}>
                    טיוטה עם מציין פנימי (פיתוח)
                  </Button>
                </form>
              </div>
              {workspace.latestPublished ? (
                <>
                  <label className={styles.editorLabel} htmlFor="ldt-editor-from-published">
                    ניסוח בסיס מהפרסום האחרון — לשמירה כטיוטה חדשה
                  </label>
                  <textarea
                    id="ldt-editor-from-published"
                    className={styles.editor}
                    value={bodyText}
                    onChange={(event) => handleEditorChange(event.target.value)}
                    dir="rtl"
                  />
                  <ActionFeedback state={saveState} />
                  {isDirty ? (
                    <p className={styles.dirtyBanner} role="status">
                      יש שינויים שלא נשמרו
                    </p>
                  ) : null}
                  <form action={saveDraftAction} onSubmit={handleSaveSubmit}>
                    <input type="hidden" name="category" value={workspace.category} />
                    <input type="hidden" name="bodyText" value={bodyText} />
                    <div className={styles.editorToolbar}>
                      <Button type="submit" variant="primary" size="md" disabled={savePending}>
                        שמירת גרסת טיוטה חדשה
                      </Button>
                    </div>
                  </form>
                </>
              ) : null}
            </div>
          ) : (
            <>
              {isDirty ? (
                <p className={styles.dirtyBanner} role="status">
                  יש שינויים שלא נשמרו — שמרו לפני אישור או פרסום
                </p>
              ) : null}
              <ActionFeedback state={saveState} />
              <label className={styles.editorLabel} htmlFor="ldt-active-editor">
                ניסוח הטיוטה
              </label>
              <textarea
                id="ldt-active-editor"
                className={styles.editor}
                value={bodyText}
                onChange={(event) => handleEditorChange(event.target.value)}
                dir="rtl"
                aria-describedby="ldt-editor-hint"
              />
              <p id="ldt-editor-hint" className={styles.metaLine}>
                כל שמירה יוצרת גרסת טיוטה חדשה; גרסאות קודמות נשמרות בהיסטוריה.
              </p>
              <form action={saveDraftAction} onSubmit={handleSaveSubmit}>
                <input type="hidden" name="category" value={workspace.category} />
                <input type="hidden" name="bodyText" value={bodyText} />
                <div className={styles.editorToolbar}>
                  <Button type="submit" variant="primary" size="md" disabled={savePending}>
                    שמירת גרסת טיוטה חדשה
                  </Button>
                </div>
              </form>
              {draft ? (
                <TechnicalDetails
                  label="טיוטה שמורה (שרת)"
                  contentSha256={draft.contentSha256}
                  revisionId={draft.revisionId}
                />
              ) : null}
            </>
          )}
        </article>

        <section
          className={[styles.panelCard, styles.approvalPanel].join(" ")}
          aria-labelledby="ldt-approval-title"
        >
          <h3 id="ldt-approval-title" className={styles.approvalTitle}>
            אישור ופרסום נוסח
          </h3>
          <p className={styles.approvalIntro}>
            אישור ופרסום הם פעולות משפטיות מפורשות על הניסוח <strong>השמור</strong> בשרת — לא על
            טקסט שלא נשמר. אין אישור או פרסום אוטומטיים.
          </p>
          <ActionFeedback state={approveState} />
          <ActionFeedback state={publishState} />
          <h4 className={styles.sideBlockTitle}>תצוגה מקדימה — הניסוח המדויק לאישור</h4>
          <div className={styles.previewBox} dir="rtl" aria-live="polite">
            {approvalPreviewText || "(ריק — אין ניסוח שמור לטיוטה הפעילה)"}
          </div>
          {isDirty ? (
            <p className={styles.dirtyBanner} role="alert">
              הניסוח במסך שונה מהטיוטה השמורה. שמרו כדי לעדכן את בסיס האישור.
            </p>
          ) : null}
          <div className={styles.approvalActions}>
            {draft?.approved ? (
              <StatusBadge label="הניסוח השמור אושר" variant="success" />
            ) : (
              <form
                action={approveAction}
                className={styles.inlineForm}
                onSubmit={handleApproveSubmit}
              >
                <input type="hidden" name="revisionId" value={draft?.revisionId ?? ""} />
                <Button
                  type="submit"
                  variant="secondary"
                  size="md"
                  disabled={approvePending || !canApproveOrPublish}
                >
                  אישור הניסוח המדויק
                </Button>
              </form>
            )}
            {draft?.approved ? (
              <form
                action={publishAction}
                className={styles.inlineForm}
                onSubmit={handlePublishSubmit}
              >
                <input type="hidden" name="revisionId" value={draft.revisionId} />
                <Button
                  type="submit"
                  variant="primary"
                  size="md"
                  disabled={publishPending || !canApproveOrPublish}
                >
                  פרסום גרסה
                </Button>
              </form>
            ) : (
              <Button type="button" variant="primary" size="md" disabled>
                פרסום גרסה
              </Button>
            )}
          </div>
          {publishBlockedReason ? (
            <p className={styles.approvalHint} role="status">
              {publishBlockedReason}
            </p>
          ) : null}
        </section>

        <section className={styles.historyPanel} aria-labelledby="ldt-history-title">
          <div className={styles.panelCard}>
            <h3 id="ldt-history-title" className={styles.approvalTitle}>
              היסטוריית גרסאות
            </h3>
            {workspace.revisionHistory.length === 0 ? (
              <p className={styles.historyEmpty}>אין גרסאות עדיין — לאחר יצירה או שמירה יופיעו כאן.</p>
            ) : (
              <ul className={styles.historyList}>
                {workspace.revisionHistory.map((revision) => (
                  <HistoryRow
                    key={revision.revisionId}
                    revision={revision}
                    isViewing={historyViewRevisionId === revision.revisionId}
                    isActiveDraft={draft?.revisionId === revision.revisionId}
                    onView={() => openHistoryView(revision.revisionId)}
                  />
                ))}
              </ul>
            )}
          </div>
        </section>
      </div>

      <aside className={styles.sidePanel} aria-label="סטטוס ומידע">
        <div className={styles.panelCard}>
          <h3 className={styles.sideBlockTitle}>סטטוס נוכחי</h3>
          <ul className={styles.sideList}>
            <li className={styles.sideListItem}>
              <span className={styles.sideListLabel}>טיוטה</span>
              <span className={styles.sideListValue}>
                {draft ? `גרסה ${draft.revisionNumber}` : "אין"}
              </span>
            </li>
            <li className={styles.sideListItem}>
              <span className={styles.sideListLabel}>נשמר לאחרונה</span>
              <span className={styles.sideListValue}>{lastSavedLabel ?? "—"}</span>
            </li>
            <li className={styles.sideListItem}>
              <span className={styles.sideListLabel}>פרסום אחרון</span>
              <span className={styles.sideListValue}>
                {workspace.latestPublished
                  ? `גרסה ${workspace.latestPublished.revisionNumber}${
                      workspace.latestPublished.publishedAtIso
                        ? ` · ${formatRevisionDateTimeHe(workspace.latestPublished.publishedAtIso)}`
                        : ""
                    }`
                  : "אין"}
              </span>
            </li>
          </ul>
        </div>
        <div className={styles.panelCard}>
          <h3 className={styles.sideBlockTitle}>תהליך אישור</h3>
          <p className={styles.processNote}>
            1. ערכו ושמרו טיוטה.
            <br />
            2. סקרו את הניסוח המדויק ואשרו.
            <br />
            3. פרסמו רק לאחר אישור — הגרסה תישמר כבלתי ניתנת לעריכה.
          </p>
        </div>
      </aside>
    </div>
  );
}

function HistoryRow({
  revision,
  isViewing,
  isActiveDraft,
  onView,
}: {
  revision: LegalDocumentTemplateRevisionView;
  isViewing: boolean;
  isActiveDraft: boolean;
  onView: () => void;
}) {
  const created = formatRevisionDateTimeHe(revision.createdAtIso);
  return (
    <li
      className={[styles.historyRow, isViewing ? styles.historyRowActive : ""]
        .filter(Boolean)
        .join(" ")}
    >
      <div className={styles.historyMain}>
        <span className={styles.historyVersion}>
          גרסה {revision.revisionNumber}
          {isActiveDraft ? " · פעילה" : ""}
        </span>
        <span className={styles.historyMeta}>
          {revisionStatusLabelHe(revision.lifecycleStatus)}
          {revision.approved ? " · אושר" : ""}
          {created ? ` · ${created}` : ""}
        </span>
        <TechnicalDetails
          label={`גרסה ${revision.revisionNumber}`}
          contentSha256={revision.contentSha256}
          revisionId={revision.revisionId}
        />
      </div>
      <button type="button" className={styles.secondaryLinkButton} onClick={onView}>
        צפייה בגרסה
      </button>
    </li>
  );
}

export function LegalDocumentTemplatesWorkspace({ categories }: Props) {
  const defaultCategory = categories[0]?.category ?? null;
  const [selectedCategory, setSelectedCategory] = useState<LegalDocumentTemplateCategory | null>(
    defaultCategory,
  );
  const [dirtyByCategory, setDirtyByCategory] = useState<
    Partial<Record<LegalDocumentTemplateCategory, boolean>>
  >({});

  const selectedWorkspace = categories.find((row) => row.category === selectedCategory) ?? null;

  const handleDirtyChange = useCallback(
    (category: LegalDocumentTemplateCategory, isDirty: boolean) => {
      setDirtyByCategory((prev) => {
        if (prev[category] === isDirty) {
          return prev;
        }
        return { ...prev, [category]: isDirty };
      });
    },
    [],
  );

  const handleSelectCategory = (category: LegalDocumentTemplateCategory) => {
    if (category === selectedCategory) {
      return;
    }
    const isDirty = selectedCategory ? Boolean(dirtyByCategory[selectedCategory]) : false;
    if (
      shouldBlockCategorySwitch({
        isDirty,
        userConfirmedDiscard: false,
      })
    ) {
      if (!window.confirm(DISCARD_SWITCH_MESSAGE)) {
        return;
      }
    }
    setSelectedCategory(category);
  };

  return (
    <div className={styles.workspace}>
      <p className={styles.introNote} role="note">
        ניהול תבניות גלובלי בלבד — לא מסמכים לבניין, לא חתימות, ולא אישור אוטומטי. מציין פנימי
        בפיתוח אינו ניסוח משפטי מאושר.
      </p>

      <nav className={styles.categoryNav} aria-label="בחירת סוג מסמך">
        <ul className={styles.categoryNavList} role="tablist">
          {categories.map((workspace) => {
            const navStatus = resolveCategoryNavStatus(workspace);
            const isSelected = workspace.category === selectedCategory;
            return (
              <li key={workspace.category} role="presentation">
                <button
                  type="button"
                  role="tab"
                  id={`ldt-tab-${workspace.category}`}
                  aria-selected={isSelected}
                  aria-controls="ldt-document-panel"
                  className={[
                    styles.categoryNavButton,
                    isSelected ? styles.categoryNavButtonActive : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  onClick={() => handleSelectCategory(workspace.category)}
                >
                  <span className={styles.categoryNavLabel}>{workspace.titleHe}</span>
                  <StatusBadge
                    label={categoryNavStatusLabelHe(navStatus)}
                    variant={categoryNavStatusBadgeVariant(navStatus)}
                  />
                </button>
              </li>
            );
          })}
        </ul>
      </nav>

      <div id="ldt-document-panel" role="tabpanel" aria-labelledby={`ldt-tab-${selectedCategory}`}>
        {selectedWorkspace ? (
          <CategoryDocumentWorkspace
            key={`${selectedWorkspace.category}-${selectedWorkspace.currentDraft?.revisionId ?? "none"}`}
            workspace={selectedWorkspace}
            onDirtyChange={handleDirtyChange}
          />
        ) : null}
      </div>
    </div>
  );
}
