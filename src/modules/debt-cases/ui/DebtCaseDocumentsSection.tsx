import { Button } from "@/components/ui/Button/Button";
import type {
  AdminDocumentAssetListItem,
  DocumentStorageUiState,
  PortalDocumentAssetListItem,
} from "@/modules/document-assets/presentation/document-asset-view.types";
import {
  DOCUMENT_ASSET_UI_COPY,
  formatDocumentAssetStatusHe,
  formatDocumentByteSizeHe,
  formatDocumentClassificationHe,
} from "@/modules/document-assets/presentation/document-messages.he";
import styles from "@/modules/debt-cases/ui/DebtCaseWorkspace.module.scss";

type PortalProps = {
  variant: "portal";
  documents: PortalDocumentAssetListItem[];
  storageState: DocumentStorageUiState;
  embedded?: boolean;
};

type AdminProps = {
  variant: "admin";
  documents: AdminDocumentAssetListItem[];
  storageState: DocumentStorageUiState;
  embedded?: boolean;
};

type Props = PortalProps | AdminProps;

export function DebtCaseDocumentsSection(props: Props) {
  const embedded = props.embedded ?? false;
  const storageDisabled = !props.storageState.configured;
  const emptyCopy =
    props.documents.length === 0
      ? DOCUMENT_ASSET_UI_COPY.debtCaseEmptyPortal
      : null;

  const Wrapper = embedded ? "div" : "section";
  const wrapperProps = embedded
    ? { className: styles.tabPanelBody }
    : {
        className: styles.section,
        id: "case-documents" as const,
        "aria-labelledby": "case-documents-title" as const,
      };

  return (
    <Wrapper {...wrapperProps}>
      {!embedded ? (
        <h2 id="case-documents-title" className={styles.sectionTitle}>
          {DOCUMENT_ASSET_UI_COPY.debtCaseSectionTitle}
        </h2>
      ) : null}
      <p className={styles.sectionHint} role="note">
        {storageDisabled ? DOCUMENT_ASSET_UI_COPY.storageNotConfigured : null}
      </p>

      <div className={styles.docActions}>
        <Button type="button" variant="secondary" size="sm" disabled aria-disabled>
          {DOCUMENT_ASSET_UI_COPY.debtCaseUploadNotAvailable}
        </Button>
      </div>

      {props.documents.length === 0 ? (
        <p className={styles.sectionHint}>{emptyCopy}</p>
      ) : (
        <table className={styles.docTable}>
            <thead>
              <tr>
                <th scope="col">{DOCUMENT_ASSET_UI_COPY.displayNameColumn}</th>
                <th scope="col">{DOCUMENT_ASSET_UI_COPY.classificationColumn}</th>
                <th scope="col">{DOCUMENT_ASSET_UI_COPY.statusColumn}</th>
                <th scope="col">{DOCUMENT_ASSET_UI_COPY.createdColumn}</th>
                <th scope="col">{DOCUMENT_ASSET_UI_COPY.sizeColumn}</th>
                {props.variant === "admin" ? (
                  <th scope="col">{DOCUMENT_ASSET_UI_COPY.documentIdColumn}</th>
                ) : null}
              </tr>
            </thead>
            <tbody>
              {props.variant === "portal"
                ? props.documents.map((doc, index) => (
                    <tr key={`${doc.displayName}-${doc.createdAtIso}-${index}`}>
                      <td>{doc.displayName}</td>
                      <td>{formatDocumentClassificationHe(doc.classification)}</td>
                      <td>{formatDocumentAssetStatusHe(doc.status)}</td>
                      <td>{new Date(doc.createdAtIso).toLocaleDateString("he-IL")}</td>
                      <td>{formatDocumentByteSizeHe(doc.byteSize)}</td>
                    </tr>
                  ))
                : props.documents.map((doc) => (
                    <tr key={doc.documentAssetId}>
                      <td>{formatDocumentClassificationHe(doc.classification)}</td>
                      <td>{formatDocumentClassificationHe(doc.classification)}</td>
                      <td>{formatDocumentAssetStatusHe(doc.status)}</td>
                      <td>{new Date(doc.createdAtIso).toLocaleDateString("he-IL")}</td>
                      <td>{formatDocumentByteSizeHe(doc.byteSize)}</td>
                      <td>{doc.documentAssetId}</td>
                    </tr>
                  ))}
            </tbody>
          </table>
      )}

      <p className={styles.sectionHint}>
        <Button type="button" variant="ghost" size="sm" disabled aria-disabled>
          {DOCUMENT_ASSET_UI_COPY.downloadDisabledLabel}
        </Button>
      </p>
    </Wrapper>
  );
}
