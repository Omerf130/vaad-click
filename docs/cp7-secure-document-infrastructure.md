# CP7 — Secure document infrastructure (storage deferred)

## Summary

CP7 introduces the reusable `document-assets` module: domain policies, Mongoose persistence, Zod validation, building-scoped authorization (CP6B), mandatory audit events, a provider-neutral storage adapter boundary, application services, and a lawyer-admin **מסמכים** panel on the building detail screen.

**No external storage provider is connected.** Upload, download, preview, malware scanning, and object lifecycle execution are intentionally disabled. No fake documents or in-memory “production” storage are used.

## Architecture

| Layer | Location |
| --- | --- |
| Domain (classifications, statuses, transitions, content policy, storage key) | `src/modules/document-assets/domain/` |
| Mongoose model | `src/modules/document-assets/infra/document-asset.model.ts` |
| Storage registry (unconfigured adapter only) | `src/modules/document-assets/infra/document-storage-registry.ts` |
| Zod validation | `src/modules/document-assets/validation/document-asset.schema.ts` |
| Authorization | `src/modules/document-assets/services/document-asset-authorization.service.ts` |
| Audit | `src/modules/document-assets/services/document-asset-audit.service.ts` |
| Application services | `src/modules/document-assets/services/document-asset.service.ts` |
| Admin UI | `src/modules/document-assets/ui/BuildingDocumentsPanel.tsx` |
| Hebrew copy | `src/modules/document-assets/presentation/document-messages.he.ts` |

Taxonomy extensions: `src/shared/audit/domain/audit-event-taxonomy.ts` (`legal_document.asset.*`).

## Data model (`DocumentAsset`)

- Public id: `documentAssetId` (UUID)
- Scope: `buildingId`, `ownerEntityType`, `ownerEntityId`
- `classification`, `status`, `accessPolicy`
- Storage fields optional until a real upload completes: `storageProvider`, `storageKey`, `detectedMimeType`, `byteSize`, `sha256Checksum`
- `uploadedByUserId`, `quarantineReason`, `deletedAt`, `retainUntil`, timestamps
- Indexes: building list, owner entity, partial pending-upload expiry; sparse unique `storageKey`

**Active documents** require full storage metadata and a completed malware scan (`assertMayBecomeActive`). Zod enforces the same for `status: active`.

## Classifications

**Enabled in CP7 (UI / upload intent validation):**

- `building_committee_authorization`
- `bank_account_ownership_proof`

**Reserved in enum for future modules (not enabled for upload in CP7):** legal/signed engagement agreements, debt case attachments, warning letters, payment/transfer proofs.

## Authorization matrix

| Role | Building scope | Committee authorization | Bank ownership proof |
| --- | --- | --- | --- |
| Lawyer-admin | Global or building admin workflow | Full manage in admin workflows | Full manage; read/download lawyer-only |
| Management company | Assigned building | No automatic read (CP7 policy flags) | Denied (lawyer-admin-only read) |
| Building representative | Assigned building | No automatic read/upload in CP7 | Denied |

Checks run in `authorizeDocumentAssetAccess` using `assertBuildingAccess`; client-supplied building IDs are not trusted for scope.

## Audit events

| Event | When |
| --- | --- |
| `legal_document.asset.upload_initiated` | Future: presigned upload started |
| `legal_document.asset.upload_completed` | Future: validated upload |
| `legal_document.asset.upload_rejected` | Storage/validation rejection (CP7: storage not configured) |
| `legal_document.asset.downloaded` | Future: successful authorized download |
| `legal_document.asset.soft_deleted` | Soft delete committed with transaction |
| `legal_document.asset.quarantined` | Future: malware/policy quarantine |

Metadata excludes file contents, original filenames, storage credentials, and signed URLs. Audit persistence failures map to `DOCUMENT_ASSET_AUDIT_PERSISTENCE` and block the operation.

## Storage adapter

Contract: `DocumentStorageAdapter` in `document-storage-adapter.types.ts` (`createUploadIntent`, `headObject`, `readObjectStream`, `deleteObject`, `getCapability`).

Default capability: **`storage_not_configured`**. Services fail with `DOCUMENT_ASSET_STORAGE_NOT_CONFIGURED` without creating active assets.

## Disabled capabilities (this checkpoint)

- Vercel Private Blob (or any provider) configuration and credentials
- Presigned/client upload flow and DB rows for pending uploads from UI
- Download, preview, streaming routes
- Malware scanning integration and `pending_scan` → `active` automation
- Upload intent expiry cleanup jobs
- Onboarding uploads, digital signatures, PDF generation, debt/payment attachments

## Activating Vercel Private Blob (later checkpoint)

1. Implement `VercelBlobDocumentStorageAdapter` registering in `document-storage-registry.ts` when env vars are present.
2. Wire `initiateDocumentAssetUpload` → create `pending_upload` row + presigned intent + `upload_initiated` audit (transaction).
3. Implement completion handler: signature/MIME validation, checksum, `headObject`, transition to `pending_scan`, scanner hook, then `active` via `assertMayBecomeActive`.
4. Implement authorized download route using `readObjectStream` after authorization + status checks.
5. Enable UI upload/download controls when `getDocumentStorageUiState().configured === true`.
6. Configure malware scanning before accepting production files.

## Security before accepting real files

- Enforce approved MIME types (PDF, JPEG, PNG) with magic-byte validation
- Max size 15 MiB (`MAX_DOCUMENT_UPLOAD_BYTE_SIZE`)
- Non-guessable keys (`buildDocumentStorageKey`)
- SHA-256 verification against stored object
- No download for non-`active` statuses
- Lawyer-only access for bank ownership proofs
- Mandatory audit on sensitive operations

## Browser-only verification checklist

1. Sign in as lawyer-admin and open **Admin → Buildings →** a building detail page.
2. Confirm section **מסמכים** appears below committee engagement.
3. Confirm message that secure storage is not yet enabled (Hebrew).
4. Confirm **העלאת מסמך (לא זמין)** is disabled; no success toast for upload.
5. Confirm empty state: **אין מסמכים פעילים לבניין זה.**
6. Confirm existing building/financial/committee panels still behave as before (CP6D unchanged).

## Deferred items reference

See § “Disabled capabilities” above; do not enable until storage + scanning are production-ready.
