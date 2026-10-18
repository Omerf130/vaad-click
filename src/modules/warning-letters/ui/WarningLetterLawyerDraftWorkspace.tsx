"use client";

import { useRouter } from "next/navigation";
import { startTransition, useActionState, useCallback, useEffect, useMemo, useRef, useState } from "react";

import { Button } from "@/components/ui/Button/Button";
import {
  approveWarningLetterWordingFormAction,
  regenerateWarningLetterDraftFormAction,
  returnWarningLetterForCorrectionFormAction,
  saveWarningLetterDraftEditsFormAction,
  type WarningLetterDraftActionState,
} from "@/modules/warning-letters/actions/lawyer-warning-letter-draft.actions";
import { buildInitialClauseDraftMap } from "@/modules/warning-letters/domain/pick-changed-clause-overrides";
import type { WarningLetterContentSnapshot } from "@/modules/warning-letters/snapshot/warning-letter-snapshot.types";
import { WarningLetterDraftLegalApprovalStatus } from "@/modules/warning-letters/domain/warning-letter-draft-legal-approval-status";
import { WarningLetterDraftLoadState } from "@/modules/warning-letters/domain/warning-letter-draft-load-state";
import { WarningLetterDraftStatus } from "@/modules/warning-letters/domain/warning-letter-draft-status";
import {
  formatWarningLetterDraftLoadStateHe,
  formatWarningLetterDraftStatusHe,
  formatWarningLetterLegalApprovalStatusHe,
  formatWarningLetterTemplateVersionDisplayHe,
} from "@/modules/warning-letters/presentation/warning-letter-draft-messages.he";
import type { WarningLetterDraftDetailResult } from "@/modules/warning-letters/services/warning-letter-draft.service";
import type { WarningLetterDeliveryRecordView } from "@/modules/warning-letters/services/warning-letter-delivery.service";
import type { WarningLetterFinalDocumentView } from "@/modules/warning-letters/services/warning-letter-finalization.service";
import type { WarningLetterLegalReadinessChecklist } from "@/modules/warning-letters/services/warning-letter-legal-readiness-checklist.service";
import { WarningLetterDocumentView } from "@/modules/warning-letters/ui/WarningLetterDocumentView";
import { WarningLetterLifecyclePanel } from "@/modules/warning-letters/ui/WarningLetterLifecyclePanel";
import { WarningLetterReadinessGroupedPanel } from "@/modules/warning-letters/ui/WarningLetterReadinessGroupedPanel";
import tabStyles from "@/modules/warning-letters/ui/WarningLetterCaseTab.module.scss";
import {
  WorkspaceAccessibleTabs,
  type WorkspaceTabDefinition,
} from "@/modules/debt-cases/ui/WorkspaceAccessibleTabs";
import { StatusBadge } from "@/components/ui/StatusBadge/StatusBadge";
import {
  buildWarningLetterDraftSaveFormDataFromChanged,
  collectClauseDraftsFromInlineEditors,
  prepareInlineWarningLetterSaveSubmission,
} from "@/modules/warning-letters/ui/warning-letter-inline-save-form";
import {
  computeLawyerDraftHasUnsavedChanges,
  deriveLawyerDraftSaveUiPhase,
  shouldShowLawyerDraftUnsavedIndicator,
} from "@/modules/warning-letters/ui/warning-letter-lawyer-save-ui";
import styles from "@/modules/warning-letters/ui/WarningLetterPreviewPanel.module.scss";

type RevisionRow = {
  draftId: string;
  draftRevision: number;
  status: WarningLetterDraftStatus;
  legalWordingApprovalStatus: WarningLetterDraftLegalApprovalStatus;
  manuallyEdited: boolean;
  createdAtIso: string;
  contentSha256Prefix: string;
};

const WL_SUBTAB_LETTER = "letter";
const WL_SUBTAB_READINESS = "readiness";
const WL_SUBTAB_MANAGEMENT = "management";

type WarningLetterLifecycleBundle = {
  debtCaseId: string;
  buildingId: string;
  draftId: string | null;
  checklist: WarningLetterLegalReadinessChecklist;
  finalDocument: WarningLetterFinalDocumentView | null;
  deliveryRecords: WarningLetterDeliveryRecordView[];
  debtorDisplayName: string;
};

type Props = {
  detail: WarningLetterDraftDetailResult;
  debtCaseId: string;
  buildingId: string;
  approvalBlockersHe: string[];
  revisionHistory: RevisionRow[];
  presentation?: "monolith" | "tabs";
  checklist?: WarningLetterLegalReadinessChecklist | null;
  lifecycle?: WarningLetterLifecycleBundle | null;
};

function ActionFeedback({ state }: { state: WarningLetterDraftActionState }) {
  if (!state.message) {
    return null;
  }
  return (
    <p className={state.ok ? styles.bannerSuccess : styles.incompleteWarning} role="status">
      {state.message}
    </p>
  );
}

export function WarningLetterLawyerDraftWorkspace({
  detail,
  debtCaseId,
  buildingId,
  approvalBlockersHe,
  revisionHistory,
  presentation = "monolith",
  checklist = null,
  lifecycle = null,
}: Props) {
  const [activeSubTab, setActiveSubTab] = useState(WL_SUBTAB_LETTER);
  const draft = detail.draft;
  const [isEditing, setIsEditing] = useState(false);
  const [clauseDrafts, setClauseDrafts] = useState<Record<string, string>>({});
  const [localSaveHint, setLocalSaveHint] = useState<string | null>(null);
  const documentShellRef = useRef<HTMLDivElement>(null);
  const [editBaselineSnapshot, setEditBaselineSnapshot] =
    useState<WarningLetterContentSnapshot | null>(null);
  const scrollStorageKey = `wl-draft-scroll-${debtCaseId}`;
  const [awaitingPersistedRevision, setAwaitingPersistedRevision] = useState<number | null>(null);
  const [saveCompletionTick, setSaveCompletionTick] = useState(0);
  const wasSavePendingRef = useRef(false);
  const router = useRouter();

  const [regenerateState, regenerateAction, regeneratePending] = useActionState(
    regenerateWarningLetterDraftFormAction,
    { ok: false },
  );
  const [saveState, dispatchSave, savePending] = useActionState(
    saveWarningLetterDraftEditsFormAction,
    { ok: false },
  );
  const [approveState, approveAction, approvePending] = useActionState(
    approveWarningLetterWordingFormAction,
    { ok: false },
  );
  const [returnState, returnAction, returnPending] = useActionState(
    returnWarningLetterForCorrectionFormAction,
    { ok: false },
  );

  const hasUnsavedChanges = useMemo(() => {
    if (!draft || !isEditing || !editBaselineSnapshot) {
      return false;
    }
    return computeLawyerDraftHasUnsavedChanges({
      baselineSnapshot: editBaselineSnapshot,
      clauseDrafts,
      isEditing,
    });
  }, [clauseDrafts, draft, isEditing, editBaselineSnapshot]);

  const saveUiPhase = useMemo(
    () =>
      deriveLawyerDraftSaveUiPhase({
        savePending,
        isEditing,
        draftRevision: draft?.draftRevision,
        awaitingPersistedRevision,
        saveState,
        saveAttemptCompleted: saveCompletionTick > 0,
      }),
    [
      savePending,
      isEditing,
      draft?.draftRevision,
      awaitingPersistedRevision,
      saveState,
      saveCompletionTick,
    ],
  );

  const showUnsavedIndicator = shouldShowLawyerDraftUnsavedIndicator({
    isEditing,
    hasUnsavedChanges,
    saveUiPhase,
  });

  const loadStateHe = formatWarningLetterDraftLoadStateHe(detail.loadState);

  const showDocument =
    draft != null &&
    draft.status === WarningLetterDraftStatus.ACTIVE &&
    draft.isCurrentForCase;

  const canEdit =
    draft != null &&
    detail.loadState === WarningLetterDraftLoadState.ACTIVE_CURRENT &&
    draft.legalWordingApprovalStatus !== WarningLetterDraftLegalApprovalStatus.APPROVED;

  const canApprove =
    draft != null &&
    approvalBlockersHe.length === 0 &&
    draft.legalWordingApprovalStatus === WarningLetterDraftLegalApprovalStatus.NONE;

  const canReturn =
    draft != null &&
    draft.legalWordingApprovalStatus === WarningLetterDraftLegalApprovalStatus.APPROVED;

  const needsRegenerate =
    detail.loadState === WarningLetterDraftLoadState.ACTIVE_STALE ||
    detail.loadState === WarningLetterDraftLoadState.NEEDS_REGENERATION ||
    detail.loadState === WarningLetterDraftLoadState.NO_DRAFT_YET;

  const startEditing = useCallback(() => {
    if (!draft) {
      return;
    }
    setLocalSaveHint(null);
    setAwaitingPersistedRevision(null);
    setEditBaselineSnapshot(draft.snapshot);
    setClauseDrafts(buildInitialClauseDraftMap(draft.snapshot));
    setIsEditing(true);
  }, [draft]);

  const cancelEditing = useCallback(() => {
    if (!draft) {
      setIsEditing(false);
      return;
    }
    setLocalSaveHint(null);
    setAwaitingPersistedRevision(null);
    setEditBaselineSnapshot(null);
    setClauseDrafts(buildInitialClauseDraftMap(draft.snapshot));
    setIsEditing(false);
  }, [draft]);

  useEffect(() => {
    if (savePending) {
      wasSavePendingRef.current = true;
      return;
    }
    if (!wasSavePendingRef.current) {
      return;
    }
    wasSavePendingRef.current = false;
    setSaveCompletionTick((tick) => tick + 1);
    if (saveState.ok && saveState.savedDraftRevision != null && !saveState.unchanged) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- server action finished; begin await RSC refresh
      setAwaitingPersistedRevision(saveState.savedDraftRevision);
      router.refresh();
    }
  }, [savePending, saveState, router]);

  useEffect(() => {
    if (!isEditing || !draft || awaitingPersistedRevision == null) {
      return;
    }
    if (draft.draftRevision !== awaitingPersistedRevision) {
      return;
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect -- persisted revision arrived from RSC refresh
    setIsEditing(false);
    setClauseDrafts(buildInitialClauseDraftMap(draft.snapshot));
    setAwaitingPersistedRevision(null);
    setSaveCompletionTick(0);
    setEditBaselineSnapshot(draft.snapshot);
    const savedScroll = sessionStorage.getItem(scrollStorageKey);
    if (savedScroll && documentShellRef.current) {
      documentShellRef.current.scrollTop = Number(savedScroll);
      sessionStorage.removeItem(scrollStorageKey);
    }
  }, [
    draft?.draftRevision,
    draft?.snapshot,
    isEditing,
    draft,
    scrollStorageKey,
    awaitingPersistedRevision,
  ]);

  useEffect(() => {
    if (!isEditing) {
      return;
    }
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      if (showUnsavedIndicator) {
        event.preventDefault();
      }
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [isEditing, showUnsavedIndicator]);

  const handleSaveSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLocalSaveHint(null);
    if (!draft || !isEditing || saveUiPhase === "saving" || saveUiPhase === "awaitingPersistedDraft") {
      return;
    }

    const baseline = editBaselineSnapshot ?? draft.snapshot;
    const prep = prepareInlineWarningLetterSaveSubmission({
      snapshot: baseline,
      clauseDrafts,
      flushedFromDom: collectClauseDraftsFromInlineEditors(documentShellRef.current),
    });

    if (prep.kind === "noop") {
      setLocalSaveHint("לא נמצאו שינויים לשמירה.");
      return;
    }

    setClauseDrafts(prep.merged);

    const formData = buildWarningLetterDraftSaveFormDataFromChanged(
      {
        debtCaseId,
        sourceDraftId: draft.draftId,
        expectedConcurrencyRevision: draft.concurrencyRevision,
      },
      prep.changed,
    );

    if (documentShellRef.current) {
      sessionStorage.setItem(scrollStorageKey, String(documentShellRef.current.scrollTop));
    }

    setSaveCompletionTick(0);
    startTransition(() => {
      dispatchSave(formData);
    });
  };

  const letterReference = draft?.letterCaseReference ?? detail.letterCaseReference ?? "—";

  const metaListBlock = draft ? (
    <dl className={styles.metaList}>
      <div>
        <dt>מספר תיק מכתב</dt>
        <dd>{letterReference}</dd>
      </div>
      <div>
        <dt>גרסת טיוטה</dt>
        <dd>{draft.draftRevision}</dd>
      </div>
      <div>
        <dt>סטטוס שמירה</dt>
        <dd>
          {formatWarningLetterDraftStatusHe(draft.status, {
            isCurrentForCase: draft.isCurrentForCase,
          })}
        </dd>
      </div>
      <div>
        <dt>אישור נוסח</dt>
        <dd>{formatWarningLetterLegalApprovalStatusHe(draft.legalWordingApprovalStatus)}</dd>
      </div>
      <div>
        <dt>גרסת תבנית</dt>
        <dd>
          {formatWarningLetterTemplateVersionDisplayHe(draft.templateVersionId)}
          <details className={tabStyles.technicalDetails}>
            <summary>מזהה טכני</summary>
            <code>{draft.templateVersionId}</code>
          </details>
        </dd>
      </div>
      <div>
        <dt>עריכה ידנית</dt>
        <dd>{draft.manuallyEdited ? "כן — דריסת ניסוח משפטי לתיק זה" : "לא"}</dd>
      </div>
    </dl>
  ) : detail.letterCaseReference ? (
    <p className={styles.metaLine}>
      מספר תיק מכתב: {detail.letterCaseReference}
    </p>
  ) : null;

  const approvalBlockersBlock =
    approvalBlockersHe.length > 0 ? (
      <div className={styles.incompleteWarning} role="status">
        <p>חסימות לאישור נוסח:</p>
        <ul>
          {approvalBlockersHe.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      </div>
    ) : null;

  const regenerateBlock = needsRegenerate ? (
    <form action={regenerateAction} className={styles.regenerateForm}>
      <input type="hidden" name="debtCaseId" value={debtCaseId} />
      <Button type="submit" disabled={regeneratePending}>
        {regeneratePending ? "מסנכרן…" : "יצירת/סנכרון גרסת טיוטה מעודכנת"}
      </Button>
      <ActionFeedback state={regenerateState} />
    </form>
  ) : null;

  const editStartBlock =
    canEdit && !isEditing ? (
      <Button type="button" onClick={startEditing}>
        עריכת טיוטה
      </Button>
    ) : null;

  const documentPreviewBlock = showDocument ? (
        <>
          {!isEditing ? (
            <p className={styles.bannerSuccess} role="status">
              תצוגה משקפת את הטיוטה השמורה (גרסה {draft!.draftRevision}) — לא נתוני תיק חיים.
            </p>
          ) : null}

          {saveState.message && !isEditing ? <ActionFeedback state={saveState} /> : null}

          <form onSubmit={handleSaveSubmit} className={isEditing ? styles.editForm : undefined}>
            {isEditing ? (
              <>
                <div className={styles.editToolbar} role="toolbar" aria-label="עריכת טיוטה">
                  <Button
                    type="submit"
                    disabled={
                      savePending ||
                      saveUiPhase === "awaitingPersistedDraft" ||
                      !hasUnsavedChanges
                    }
                  >
                    {savePending || saveUiPhase === "saving"
                      ? "שומר…"
                      : saveUiPhase === "awaitingPersistedDraft"
                        ? "מעדכן תצוגה…"
                        : "שמירת שינויים"}
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={cancelEditing}
                    disabled={savePending || saveUiPhase === "awaitingPersistedDraft"}
                  >
                    ביטול
                  </Button>
                  {showUnsavedIndicator ? (
                    <span className={styles.unsavedIndicator} role="status">
                      יש שינויים שלא נשמרו
                    </span>
                  ) : saveUiPhase === "awaitingPersistedDraft" ? (
                    <span className={styles.metaLine} role="status">
                      השמירה הצליחה — מעדכן את המסמך…
                    </span>
                  ) : saveUiPhase === "failed" ? (
                    <span className={styles.incompleteWarning} role="status">
                      השמירה נכשלה — העריכה נשמרה במסך
                    </span>
                  ) : (
                    <span className={styles.metaLine}>אין שינויים לשמירה</span>
                  )}
                </div>
                {localSaveHint ? (
                  <p className={styles.incompleteWarning} role="status">
                    {localSaveHint}
                  </p>
                ) : null}
                <ActionFeedback state={saveState} />
              </>
            ) : null}

            {draft!.previewWarningHe ? (
              <p className={styles.incompleteWarning} role="status">
                {draft!.previewWarningHe}
              </p>
            ) : null}

            <div className={styles.previewFrame}>
              <div ref={documentShellRef} className={styles.documentShell}>
                <WarningLetterDocumentView
                  snapshot={draft!.snapshot}
                  mode={isEditing ? "edit" : "view"}
                  clauseDrafts={isEditing ? clauseDrafts : undefined}
                  onClauseDraftChange={(clauseId, body) => {
                    setClauseDrafts((prev) => ({ ...prev, [clauseId]: body }));
                  }}
                />
              </div>
            </div>
          </form>

          {isEditing ? (
            <p className={styles.incompleteWarning} role="status">
              סעיפים עם פס כתום — ניתנים לעריכה ישירות במסמך. סכומים, טבלת חוב, זהויות ותשלום — לקריאה
              בלבד.
            </p>
          ) : null}
        </>
      ) : draft && !needsRegenerate ? (
        <p className={styles.incompleteWarning} role="status">
          תצוגת גוף המכתב תופיע לאחר סנכרון טיוטה פעילה מעודכנת.
        </p>
      ) : null;

  const approveBlock = canApprove ? (
        <form action={approveAction} className={styles.regenerateForm}>
          <input type="hidden" name="debtCaseId" value={debtCaseId} />
          <input type="hidden" name="draftId" value={draft!.draftId} />
          <input type="hidden" name="buildingId" value={buildingId} />
          {draft!.manuallyEdited ? (
            <label className={styles.checkboxRow}>
              <input type="checkbox" name="manualOverrideAcknowledged" />
              <span>אני מאשר/ת שבדקתי את הניסוח הידני — זו דריסה לתיק זה, לא אישור תבנית גלובלית.</span>
            </label>
          ) : null}
          <Button type="submit" disabled={approvePending}>
            {approvePending ? "מאשר…" : "אישור נוסח המכתב"}
          </Button>
          <ActionFeedback state={approveState} />
        </form>
      ) : null;

  const returnBlock = canReturn ? (
        <form action={returnAction} className={styles.regenerateForm}>
          <input type="hidden" name="debtCaseId" value={debtCaseId} />
          <input type="hidden" name="draftId" value={draft!.draftId} />
          <label className={styles.clauseEditField}>
            <span>סיבת החזרה לתיקון (חובה)</span>
            <textarea name="returnReason" rows={3} dir="rtl" className={styles.clauseTextarea} required />
          </label>
          <Button type="submit" disabled={returnPending}>
            {returnPending ? "מחזיר…" : "החזרה לתיקון"}
          </Button>
          <ActionFeedback state={returnState} />
        </form>
      ) : null;

  const revisionHistoryBlock =
    revisionHistory.length > 0 ? (
        <details className={styles.historyDetails}>
          <summary>היסטוריית גרסאות (עורך דין)</summary>
          <table className={styles.historyTable}>
            <thead>
              <tr>
                <th>גרסה</th>
                <th>סטטוס</th>
                <th>אישור נוסח</th>
                <th>עריכה ידנית</th>
                <th>נוצר</th>
              </tr>
            </thead>
            <tbody>
              {revisionHistory.map((row) => (
                <tr key={row.draftId}>
                  <td>{row.draftRevision}</td>
                  <td>{row.status}</td>
                  <td>{formatWarningLetterLegalApprovalStatusHe(row.legalWordingApprovalStatus)}</td>
                  <td>{row.manuallyEdited ? "כן" : "לא"}</td>
                  <td>{new Date(row.createdAtIso).toLocaleString("he-IL")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </details>
      ) : null;

  if (presentation === "tabs") {
    const readinessChecklist = checklist ?? lifecycle?.checklist ?? null;
    const finalizationBlocked = readinessChecklist && !readinessChecklist.finalizationAllowed;

    const wlTabs: WorkspaceTabDefinition[] = [
      {
        id: WL_SUBTAB_LETTER,
        label: "המכתב",
        panel: (
          <div>
            <div className={tabStyles.letterTabHeader}>
              <p className={tabStyles.letterTabMeta}>
                {letterReference} · גרסה {draft?.draftRevision ?? "—"} · {loadStateHe}
              </p>
              {editStartBlock}
            </div>
            {needsRegenerate ? (
              <p className={styles.metaLine} role="status">
                נדרש סנכרון טיוטה —{" "}
                <button
                  type="button"
                  className={tabStyles.inlineLink}
                  onClick={() => setActiveSubTab(WL_SUBTAB_MANAGEMENT)}
                >
                  עבור לניהול טיוטה
                </button>
              </p>
            ) : null}
            {documentPreviewBlock}
          </div>
        ),
      },
      {
        id: WL_SUBTAB_READINESS,
        label: "מוכנות משפטית",
        panel: readinessChecklist ? (
          <WarningLetterReadinessGroupedPanel checklist={readinessChecklist} />
        ) : (
          <p className={styles.metaLine}>נתוני מוכנות משפטית אינם זמינים לתיק זה.</p>
        ),
      },
      {
        id: WL_SUBTAB_MANAGEMENT,
        label: "ניהול טיוטה",
        panel: (
          <div className={tabStyles.managementStack}>
            <p className={styles.metaLine} role="status">
              {loadStateHe}
            </p>
            {metaListBlock}
            {approvalBlockersBlock}
            {regenerateBlock}
            {approveBlock}
            {returnBlock}
            {lifecycle ? (
              <WarningLetterLifecyclePanel
                embedded
                debtCaseId={lifecycle.debtCaseId}
                buildingId={lifecycle.buildingId}
                draftId={lifecycle.draftId}
                checklist={lifecycle.checklist}
                finalDocument={lifecycle.finalDocument}
                deliveryRecords={lifecycle.deliveryRecords}
                debtorDisplayName={lifecycle.debtorDisplayName}
              />
            ) : null}
            {revisionHistoryBlock}
          </div>
        ),
      },
    ];

    return (
      <div className={tabStyles.root}>
        <header className={tabStyles.statusHeader}>
          <div>
            <h2 className={tabStyles.statusTitle}>מכתב התראה · {letterReference}</h2>
            <div className={tabStyles.statusBadges}>
              {draft ? (
                <StatusBadge variant="neutral" label={`גרסת טיוטה ${draft.draftRevision}`} />
              ) : null}
              <StatusBadge
                variant={
                  detail.loadState === WarningLetterDraftLoadState.ACTIVE_CURRENT
                    ? "success"
                    : "warning"
                }
                label={
                  detail.loadState === WarningLetterDraftLoadState.ACTIVE_CURRENT
                    ? "טיוטה מעודכנת"
                    : "טיוטה — דורש טיפול"
                }
              />
              {draft ? (
                <StatusBadge
                  variant={
                    draft.legalWordingApprovalStatus ===
                    WarningLetterDraftLegalApprovalStatus.APPROVED
                      ? "success"
                      : "warning"
                  }
                  label={formatWarningLetterLegalApprovalStatusHe(draft.legalWordingApprovalStatus)}
                />
              ) : null}
              {readinessChecklist ? (
                <StatusBadge
                  variant={readinessChecklist.finalizationAllowed ? "success" : "warning"}
                  label={
                    readinessChecklist.finalizationAllowed
                      ? "סגירה — מותרת"
                      : "סגירה — חסומה"
                  }
                />
              ) : null}
            </div>
            <p className={tabStyles.statusMeta}>
              תיעוד הגשה ידני אינו שליחת הודעה לחייב. שליחה אוטומטית — לא פעילה.
            </p>
          </div>
        </header>

        {finalizationBlocked ? (
          <p className={tabStyles.statusWarning} role="status">
            לא ניתן לסגור מסמך סופי עד השלמת דרישות המוכנות.{" "}
            <button
              type="button"
              className={tabStyles.inlineLink}
              onClick={() => setActiveSubTab(WL_SUBTAB_READINESS)}
            >
              הצגת סיבות
            </button>
          </p>
        ) : null}

        {!finalizationBlocked && approvalBlockersHe.length > 0 ? (
          <p className={tabStyles.statusWarning} role="status">
            אישור נוסח חסום — {approvalBlockersHe.length} חסימות פעילות.{" "}
            <button
              type="button"
              className={tabStyles.inlineLink}
              onClick={() => setActiveSubTab(WL_SUBTAB_READINESS)}
            >
              פירוט במוכנות משפטית
            </button>
          </p>
        ) : null}

        <WorkspaceAccessibleTabs
          tabs={wlTabs}
          activeTabId={activeSubTab}
          onTabChange={setActiveSubTab}
          ariaLabel="מכתב התראה"
          mountHiddenPanels
        />
      </div>
    );
  }

  return (
    <section className={styles.previewSection} aria-labelledby="warning-letter-lawyer-workspace">
      <h2 id="warning-letter-lawyer-workspace" className={styles.previewTitle}>
        טיוטת מכתב התראה — עורך דין
      </h2>

      <p className={styles.metaLine} role="status">
        {loadStateHe}
      </p>

      {metaListBlock}
      {approvalBlockersBlock}
      {regenerateBlock}
      {canEdit && !isEditing ? <p className={styles.linkRow}>{editStartBlock}</p> : null}
      {documentPreviewBlock}
      {approveBlock}
      {returnBlock}
      {revisionHistoryBlock}
    </section>
  );
}
