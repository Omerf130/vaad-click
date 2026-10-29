import Link from "next/link";
import { notFound } from "next/navigation";

import { AdminPageFrame } from "@/modules/admin/components/AdminPageFrame";
import { BuildingLegalDocumentError } from "@/modules/building-legal-documents/domain/building-legal-document-errors";
import {
  getBuildingLegalDocumentPreview,
  type BuildingLegalDocumentPreviewView,
} from "@/modules/building-legal-documents/services/building-legal-document.service";
import { buildingLegalDocumentPdfUrls } from "@/modules/building-legal-documents/presentation/building-legal-document-pdf-urls";
import { BuildingLegalDocumentReadOnlyPreview } from "@/modules/building-legal-documents/ui/BuildingLegalDocumentReadOnlyPreview";
import type { AuthenticatedContext } from "@/shared/auth/get-authenticated-context";
import { requireLawyerAdminPortal } from "@/shared/auth/require-access";

type PageProps = {
  params: Promise<{ buildingId: string; documentId: string }>;
};

async function loadPreviewForAdmin(input: {
  context: AuthenticatedContext;
  buildingId: string;
  documentId: string;
}): Promise<BuildingLegalDocumentPreviewView | null> {
  try {
    return await getBuildingLegalDocumentPreview({
      context: input.context,
      buildingLegalDocumentId: input.documentId,
      expectedBuildingId: input.buildingId,
    });
  } catch (error) {
    if (error instanceof BuildingLegalDocumentError) {
      return null;
    }
    throw error;
  }
}

export default async function AdminBuildingLegalDocumentPreviewPage({ params }: PageProps) {
  const context = await requireLawyerAdminPortal();
  const { buildingId, documentId } = await params;
  const document = await loadPreviewForAdmin({ context, buildingId, documentId });

  if (!document) {
    notFound();
  }

  return (
    <AdminPageFrame
      title={document.titleHe}
      subtitle="תצוגת מסמך משפטי לבניין"
      toolbar={
        <Link href={`/app/admin/buildings/${buildingId}`}>חזרה לפרטי הבניין</Link>
      }
    >
      <BuildingLegalDocumentReadOnlyPreview
        document={document}
        showSignatureNote={false}
        pdfLinks={buildingLegalDocumentPdfUrls({
          audience: "admin",
          buildingId,
          documentId,
        })}
      />
    </AdminPageFrame>
  );
}
