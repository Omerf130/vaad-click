/** Approved MIME types for future uploads (CP7 — validation contracts only). */
export const APPROVED_DOCUMENT_MIME_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
] as const;

export type ApprovedDocumentMimeType = (typeof APPROVED_DOCUMENT_MIME_TYPES)[number];

/** Maximum upload size in bytes (15 MiB) — enforced when storage is active. */
export const MAX_DOCUMENT_UPLOAD_BYTE_SIZE = 15 * 1024 * 1024;

/** Presigned upload intent TTL — design constant for future activation. */
export const DOCUMENT_UPLOAD_INTENT_TTL_MS = 10 * 60 * 1000;
