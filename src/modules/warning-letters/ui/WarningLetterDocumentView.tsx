"use client";

import { useEffect, useMemo, useRef } from "react";

import { buildWarningLetterDocumentSegments } from "@/modules/warning-letters/render/warning-letter-document-segments";
import type { WarningLetterContentSnapshot } from "@/modules/warning-letters/snapshot/warning-letter-snapshot.types";
export type WarningLetterDocumentRenderMode = "view" | "edit";

type Props = {
  snapshot: WarningLetterContentSnapshot;
  mode: WarningLetterDocumentRenderMode;
  /** Current clause bodies while editing (keyed by clauseId). */
  clauseDrafts?: Record<string, string>;
  onClauseDraftChange?: (clauseId: string, body: string) => void;
  documentRef?: React.RefObject<HTMLElement | null>;
};

function InlineEditableClauseBody({
  clauseId,
  displayNumber,
  body,
  onBodyChange,
}: {
  clauseId: string;
  displayNumber: number;
  body: string;
  onBodyChange?: (body: string) => void;
}) {
  const editableRef = useRef<HTMLSpanElement>(null);
  const lastExternalBody = useRef(body);

  useEffect(() => {
    const el = editableRef.current;
    if (!el) {
      return;
    }
    if (document.activeElement === el) {
      return;
    }
    if (el.textContent !== body) {
      el.textContent = body;
    }
    lastExternalBody.current = body;
  }, [body]);

  return (
    <span
      ref={editableRef}
      className="clauseEditableBody"
      contentEditable
      suppressContentEditableWarning
      role="textbox"
      aria-label={`סעיף ${displayNumber}`}
      data-clause-id={clauseId}
      onInput={(event) => {
        const text = (event.currentTarget.innerText ?? "").replace(/\r\n/g, "\n");
        lastExternalBody.current = text;
        onBodyChange?.(text);
      }}
      onBlur={(event) => {
        const text = (event.currentTarget.innerText ?? "").replace(/\r\n/g, "\n");
        lastExternalBody.current = text;
        onBodyChange?.(text);
      }}
    />
  );
}

function ClauseParagraph({
  clauseId,
  displayNumber,
  body,
  editable,
  mode,
  onBodyChange,
}: {
  clauseId: string;
  displayNumber: number;
  body: string;
  editable: boolean;
  mode: WarningLetterDocumentRenderMode;
  onBodyChange?: (body: string) => void;
}) {
  const isInlineEditable = mode === "edit" && editable;

  return (
    <p className={`clause ${isInlineEditable ? "editableInline" : ""}`}>
      <span className="clauseNumber">{displayNumber}.</span>{" "}
      {isInlineEditable ? (
        <InlineEditableClauseBody
          clauseId={clauseId}
          displayNumber={displayNumber}
          body={body}
          onBodyChange={onBodyChange}
        />
      ) : (
        <span>{body}</span>
      )}
    </p>
  );
}

export function WarningLetterDocumentView({
  snapshot,
  mode,
  clauseDrafts,
  onClauseDraftChange,
  documentRef,
}: Props) {
  const segments = useMemo(() => buildWarningLetterDocumentSegments(snapshot), [snapshot]);

  return (
    <article
      ref={documentRef as React.RefObject<HTMLElement>}
      className="warningLetterDocument"
      dir="rtl"
      lang="he"
    >
      {segments.map((segment, index) => {
        switch (segment.kind) {
          case "letterhead":
            return (
              <header key={`${segment.kind}-${index}`} className="letterhead">
                <p className="firmName">{segment.firmName}</p>
                <p className="previewBanner" role="status">
                  טיוטה לתצוגה בלבד — לא נשלחה
                </p>
              </header>
            );
          case "metaRow":
            return (
              <div key={`${segment.kind}-${index}`} className="metaRow">
                <span>{segment.addressee}</span>
                <span>{segment.dateAndReference}</span>
              </div>
            );
          case "debtorName":
            return (
              <p key={`${segment.kind}-${index}`} className="debtorName">
                {segment.text}
              </p>
            );
          case "address":
            return (
              <p key={`${segment.kind}-${index}`} className="address">
                {segment.text.split("\n").map((line, lineIndex, lines) => (
                  <span key={lineIndex}>
                    {line}
                    {lineIndex < lines.length - 1 ? <br /> : null}
                  </span>
                ))}
              </p>
            );
          case "deliveryChannel":
            return (
              <p key={`${segment.kind}-${index}`} className="deliveryChannel">
                <u>{segment.text}</u>
              </p>
            );
          case "subject":
            return (
              <p key={`${segment.kind}-${index}`} className="subject">
                <strong>{segment.text}</strong>
              </p>
            );
          case "intro":
            return (
              <p key={`${segment.kind}-${index}`} className="intro">
                {segment.text}
              </p>
            );
          case "clause": {
            const body = clauseDrafts?.[segment.clauseId] ?? segment.body;
            return (
              <ClauseParagraph
                key={`${segment.kind}-${segment.clauseId}`}
                clauseId={segment.clauseId}
                displayNumber={segment.displayNumber}
                body={body}
                editable={segment.editable}
                mode={mode}
                onBodyChange={(text) => onClauseDraftChange?.(segment.clauseId, text)}
              />
            );
          }
          case "debtTable":
            return (
              <table key={`${segment.kind}-${index}`} className="debtTable" dir="rtl">
                <thead>
                  <tr>
                    <th>מספר חודשי פיגור</th>
                    <th>סכום חוב</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>סה&quot;כ {segment.debtMonthsCount} חודשים</td>
                    <td>{segment.principalDisplay}</td>
                  </tr>
                  <tr className="debtTotal">
                    <td>סה״כ :</td>
                    <td>{segment.principalDisplay}</td>
                  </tr>
                </tbody>
              </table>
            );
          case "paymentBlock":
            return (
              <div key={`${segment.kind}-${index}`} className="paymentBlock">
                {segment.body.split("\n").map((line, lineIndex, lines) => (
                  <span key={lineIndex}>
                    {line}
                    {lineIndex < lines.length - 1 ? <br /> : null}
                  </span>
                ))}
              </div>
            );
          case "contact":
            return (
              <p key={`${segment.kind}-${index}`} className="contact">
                לבירורים נוספים, ניתן להתקשר לנייד: {segment.inquiriesMobileDisplay}
              </p>
            );
          case "signature":
            return (
              <footer key={`${segment.kind}-${index}`} className="signature">
                <p>בברכה,</p>
                <p className="signaturePlaceholder">[מקום לחתימה וחותמת — לא ב-CP8.4B]</p>
                <p>{segment.signatoryName}</p>
                <p>{segment.barRegistrationNumber}</p>
              </footer>
            );
          case "evidence":
            return (
              <p key={`${segment.kind}-${index}`} className="evidence">
                {segment.text}
              </p>
            );
          default:
            return null;
        }
      })}
    </article>
  );
}
