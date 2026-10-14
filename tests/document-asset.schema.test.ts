import { describe, expect, it } from "vitest";

import { DocumentClassification } from "@/modules/document-assets/domain/document-classification";
import { DocumentAssetStatus } from "@/modules/document-assets/domain/document-asset-status";
import { DocumentOwnerEntityType } from "@/modules/document-assets/domain/document-owner-entity-type";
import { documentAssetRecordSchema } from "@/modules/document-assets/validation/document-asset.schema";

const BUILDING_ID = "11111111-1111-4111-8111-111111111111";
const DOC_ID = "22222222-2222-4222-8222-222222222222";

const baseRecord = {
  documentAssetId: DOC_ID,
  buildingId: BUILDING_ID,
  ownerEntityType: DocumentOwnerEntityType.BUILDING,
  ownerEntityId: BUILDING_ID,
  classification: DocumentClassification.BUILDING_COMMITTEE_AUTHORIZATION,
  status: DocumentAssetStatus.PENDING_UPLOAD,
  accessPolicy: {
    managementCompanyMayView: false,
    buildingOperatorsMayUpload: false,
    lawyerAdminOnlyRead: false,
  },
  storageKey: null,
  storageProvider: null,
  sha256Checksum: null,
  byteSize: null,
  detectedMimeType: null,
};

describe("documentAssetRecordSchema", () => {
  it("accepts pending upload without storage metadata", () => {
    expect(documentAssetRecordSchema.safeParse(baseRecord).success).toBe(true);
  });

  it("rejects active status without verified storage fields", () => {
    const result = documentAssetRecordSchema.safeParse({
      ...baseRecord,
      status: DocumentAssetStatus.ACTIVE,
    });
    expect(result.success).toBe(false);
  });

  it("accepts active status when storage and checksum are present", () => {
    const result = documentAssetRecordSchema.safeParse({
      ...baseRecord,
      status: DocumentAssetStatus.ACTIVE,
      storageKey: "buildings/x/assets/y/z",
      storageProvider: "vercel_blob",
      sha256Checksum: "a".repeat(64),
      byteSize: 1024,
      detectedMimeType: "application/pdf",
    });
    expect(result.success).toBe(true);
  });
});
