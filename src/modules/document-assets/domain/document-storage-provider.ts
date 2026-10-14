/** Future: Vercel Private Blob. No provider is configured in CP7. */
export const DocumentStorageProvider = {
  VERCEL_BLOB: "vercel_blob",
} as const;

export type DocumentStorageProvider =
  (typeof DocumentStorageProvider)[keyof typeof DocumentStorageProvider];
