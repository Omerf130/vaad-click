"use client";

import { Button } from "@/components/ui/Button/Button";
import type {
  AdminDocumentAssetListItem,
  DocumentStorageUiState,
} from "@/modules/document-assets/presentation/document-asset-view.types";
import {
  DOCUMENT_ASSET_UI_COPY,
  formatDocumentAssetStatusHe,
  formatDocumentByteSizeHe,
  formatDocumentClassificationHe,
} from "@/modules/document-assets/presentation/document-messages.he";
import styles from "@/modules/users/ui/AdminUsers.module.scss";

type BuildingDocumentsPanelProps = {
  buildingId: string;
  documents: AdminDocumentAssetListItem[];
  storageState: DocumentStorageUiState;
};

export function BuildingDocumentsPanel({
  buildingId,
  documents,
  storageState,
}: BuildingDocumentsPanelProps) {
  const storageDisabled = !storageState.configured;

  return (
    <section className={styles.detailCard} aria-labelledby="building-documents-heading">
      <h2 id="building-documents-heading" className={styles.workspaceTitle}>
        {DOCUMENT_ASSET_UI_COPY.sectionTitle}
      </h2>
      <p className={styles.metaLine} role="note">
        {storageDisabled ? DOCUMENT_ASSET_UI_COPY.storageNotConfigured : null}
      </p>
      <input type="hidden" name="buildingId" value={buildingId} readOnly />

      <div className={styles.filters}>
        <Button type="button" variant="primary" size="sm" disabled aria-disabled>
          {DOCUMENT_ASSET_UI_COPY.uploadDisabledLabel}
        </Button>
      </div>

      {documents.length === 0 ? (
        <p className={styles.metaLine}>{DOCUMENT_ASSET_UI_COPY.emptyState}</p>
      ) : (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th scope="col">{DOCUMENT_ASSET_UI_COPY.classificationColumn}</th>
                <th scope="col">{DOCUMENT_ASSET_UI_COPY.statusColumn}</th>
                <th scope="col">{DOCUMENT_ASSET_UI_COPY.createdColumn}</th>
                <th scope="col">{DOCUMENT_ASSET_UI_COPY.sizeColumn}</th>
                <th scope="col">{DOCUMENT_ASSET_UI_COPY.documentIdColumn}</th>
                <th scope="col" className={styles.visuallyHidden}>
                  פעולות
                </th>
              </tr>
            </thead>
            <tbody>
              {documents.map((doc) => (
                <tr key={doc.documentAssetId}>
                  <td>{formatDocumentClassificationHe(doc.classification)}</td>
                  <td>{formatDocumentAssetStatusHe(doc.status)}</td>
                  <td>{new Date(doc.createdAtIso).toLocaleDateString("he-IL")}</td>
                  <td>{formatDocumentByteSizeHe(doc.byteSize)}</td>
                  <td>
                    <span className={styles.definitionValue}>{doc.documentAssetId}</span>
                  </td>
                  <td>
                    <Button type="button" variant="secondary" size="sm" disabled aria-disabled>
                      {DOCUMENT_ASSET_UI_COPY.downloadDisabledLabel}
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
