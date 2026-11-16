"use client";

import { useCallback, useMemo, useState } from "react";

import { Button } from "@/components/ui/Button/Button";
import type { LegalDocumentTemplateRevisionView } from "@/modules/legal-document-templates/services/legal-document-template.service";
import {
  formatLegalDocumentTemplateOperativeStatusHe,
  LegalDocumentTemplateOperativeStatus,
} from "@/modules/legal-document-templates/domain/legal-document-template-operative-status";
import {
  renderStatementOfClaimTemplateSectionPreviewHtml,
  STATEMENT_OF_CLAIM_PLACEHOLDER_REGISTRY,
} from "@/modules/statement-of-claim-templates/domain/statement-of-claim-placeholder-registry";
import {
  parseStatementOfClaimTemplateBody,
  renderStatementOfClaimTemplatePlainPreview,
  serializeStatementOfClaimTemplateBody,
  STATEMENT_OF_CLAIM_DEV_ONLY_BANNER_HE,
  type StatementOfClaimTemplateBody,
} from "@/modules/statement-of-claim-templates/domain/statement-of-claim-template-body";
import {
  STATEMENT_OF_CLAIM_TEMPLATE_SECTION_ORDER,
} from "@/modules/statement-of-claim-templates/domain/statement-of-claim-template-section";
import styles from "@/modules/legal-document-templates/ui/LegalDocumentTemplatesWorkspace.module.scss";

type Props = {
  draft: LegalDocumentTemplateRevisionView | null;
  bodyText: string;
  onBodyTextChange: (nextSerialized: string) => void;
  readOnly?: boolean;
};

function parseBodyOrNull(raw: string): StatementOfClaimTemplateBody | null {
  const parsed = parseStatementOfClaimTemplateBody(raw);
  return parsed.ok ? parsed.body : null;
}

export function StatementOfClaimTemplateEditor({
  draft,
  bodyText,
  onBodyTextChange,
  readOnly = false,
}: Props) {
  const parsedBody = useMemo(() => parseBodyOrNull(bodyText), [bodyText]);
  const [activeSectionId, setActiveSectionId] = useState(
    STATEMENT_OF_CLAIM_TEMPLATE_SECTION_ORDER[0] ?? "court_jurisdiction",
  );
  const [showPreview, setShowPreview] = useState(true);

  const updateSectionBody = useCallback(
    (sectionId: string, nextTemplate: string) => {
      if (!parsedBody || readOnly) {
        return;
      }
      const next: StatementOfClaimTemplateBody = {
        ...parsedBody,
        sections: {
          ...parsedBody.sections,
          [sectionId]: {
            ...parsedBody.sections[sectionId]!,
            bodyTemplate: nextTemplate,
          },
        },
      };
      onBodyTextChange(serializeStatementOfClaimTemplateBody(next));
    },
    [onBodyTextChange, parsedBody, readOnly],
  );

  const insertPlaceholder = useCallback(
    (token: string) => {
      if (!parsedBody || readOnly) {
        return;
      }
      const section = parsedBody.sections[activeSectionId];
      if (!section) {
        return;
      }
      const nextTemplate = `${section.bodyTemplate}${section.bodyTemplate.endsWith("\n") ? "" : " "}${token}`;
      updateSectionBody(activeSectionId, nextTemplate);
    },
    [activeSectionId, parsedBody, readOnly, updateSectionBody],
  );

  if (!parsedBody) {
    return (
      <p className={styles.feedbackError} role="alert">
        לא ניתן לטעון מבנה תבנית — פנו לתמיכה.
      </p>
    );
  }

  const activeSection = parsedBody.sections[activeSectionId];
  const previewHtml = activeSection
    ? renderStatementOfClaimTemplateSectionPreviewHtml(activeSection.bodyTemplate)
    : "";

  return (
    <div className={styles.socEditorRoot}>
      <p className={styles.readOnlyBanner} role="status">
        {STATEMENT_OF_CLAIM_DEV_ONLY_BANNER_HE}
        {draft
          ? ` · ${formatLegalDocumentTemplateOperativeStatusHe(draft.operativeStatus)}`
          : null}
      </p>

      <div className={styles.socLayout}>
        <nav className={styles.socSectionNav} aria-label="מקטעי תבנית">
          {STATEMENT_OF_CLAIM_TEMPLATE_SECTION_ORDER.map((sectionId) => {
            const title = parsedBody.sections[sectionId]?.titleHe ?? sectionId;
            return (
              <button
                key={sectionId}
                type="button"
                className={
                  activeSectionId === sectionId ? styles.socNavItemActive : styles.socNavItem
                }
                onClick={() => setActiveSectionId(sectionId)}
              >
                {title}
              </button>
            );
          })}
        </nav>

        <div className={styles.socMain}>
          {activeSection ? (
            <>
              <label className={styles.editorLabel} htmlFor="soc-section-body">
                נוסח מקטע (מצייני מקום בלבד — לא טקסט משפטי מומצא)
              </label>
              <textarea
                id="soc-section-body"
                className={styles.editor}
                dir="rtl"
                rows={12}
                value={activeSection.bodyTemplate}
                readOnly={readOnly}
                onChange={(event) => updateSectionBody(activeSectionId, event.target.value)}
              />
              {!readOnly ? (
                <div className={styles.socPlaceholderBar}>
                  <p className={styles.metaLine}>הוספת מציין מקום:</p>
                  <div className={styles.socPlaceholderButtons}>
                    {STATEMENT_OF_CLAIM_PLACEHOLDER_REGISTRY.map((row) => (
                      <Button
                        key={row.id}
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={() => insertPlaceholder(row.token)}
                        title={row.kind === "lawyer_controlled" ? "מילוי עורך דין" : "נתון עובדתי"}
                      >
                        {row.labelHe}
                      </Button>
                    ))}
                  </div>
                </div>
              ) : null}
            </>
          ) : null}

          <div className={styles.socPreviewHeader}>
            <h3 className={styles.subsectionTitle}>תצוגה מקדימה (נתוני דוגמה)</h3>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setShowPreview((value) => !value)}
            >
              {showPreview ? "הסתר" : "הצג"}
            </Button>
          </div>
          {showPreview ? (
            <div
              className={styles.previewBox}
              dir="rtl"
              dangerouslySetInnerHTML={{ __html: previewHtml }}
            />
          ) : null}
          <details className={styles.techDetails}>
            <summary className={styles.techSummary}>תצוגה מלאה (טקסט)</summary>
            <pre className={styles.techHash}>{renderStatementOfClaimTemplatePlainPreview(parsedBody)}</pre>
          </details>
        </div>
      </div>

      {draft?.operativeStatus === LegalDocumentTemplateOperativeStatus.DEVELOPMENT_ONLY ? (
        <p className={styles.dirtyBanner} role="status">
          תבנית פיתוח — אישור ופרסום מבצעי חסומים עד לתבנית מאושרת עתידית.
        </p>
      ) : null}
    </div>
  );
}