import { randomBytes } from "node:crypto";

import { isWellFormedBuildingPublicId } from "@/shared/auth/building-access/building-public-id";

const STORAGE_KEY_SEGMENT = /^[a-f0-9]{32}$/;

export function buildDocumentStorageKey(input: {
  buildingId: string;
  documentAssetId: string;
}): string {
  if (!isWellFormedBuildingPublicId(input.buildingId)) {
    throw new Error("Invalid building id for storage key");
  }
  if (!/^[0-9a-f-]{36}$/i.test(input.documentAssetId)) {
    throw new Error("Invalid document asset id for storage key");
  }
  const suffix = randomBytes(16).toString("hex");
  if (!STORAGE_KEY_SEGMENT.test(suffix)) {
    throw new Error("Storage key suffix generation failed");
  }
  return `buildings/${input.buildingId}/assets/${input.documentAssetId}/${suffix}`;
}

export function assertSafeStorageKey(storageKey: string): void {
  if (
    storageKey.includes("..") ||
    storageKey.startsWith("/") ||
    storageKey.includes("\\") ||
    !storageKey.startsWith("buildings/")
  ) {
    throw new Error("Unsafe storage key");
  }
}
