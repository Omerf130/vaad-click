import Link from "next/link";
import { notFound } from "next/navigation";

import { BuildingLegalDocumentError } from "@/modules/building-legal-documents/domain/building-legal-document-errors";
import {
  getBuildingLegalDocumentPreview,
  type BuildingLegalDocumentPreviewView,
} from "@/modules/building-legal-documents/services/building-legal-document.service";
import { buildingLegalDocumentPdfUrls } from "@/modules/building-legal-documents/presentation/building-legal-document-pdf-urls";
import { BuildingLegalDocumentReadOnlyPreview } from "@/modules/building-legal-documents/ui/BuildingLegalDocumentReadOnlyPreview";
import portalDocStyles from "@/modules/building-legal-documents/ui/BuildingLegalDocumentsPortalPanel.module.scss";
import { OPERATOR_PORTAL_ROUTES } from "@/modules/portal/presentation/operator-portal-nav";
import { OperatorPortalPageFrame } from "@/modules/portal/ui/OperatorPortalPageFrame";
import type { AuthenticatedContext } from "@/shared/auth/get-authenticated-context";
import { requireBuildingPortalAccess } from "@/shared/auth/require-building-access";

type PageProps = {
  params: Promise<{ buildingId: string; documentId: string }>;
};

async function loadPreviewForPortal(input: {
  context: AuthenticatedContext;
  buildingId: string;
  documentId: string;
}): Promise<BuildingLegalDocumentPreviewView | null> {
  try {
    return await getBuildingLegalDocumentPreview({
      context: input.context,
      buildingLegalDocumentId: input.documentId,
      expectedBuildingId: input.buildingId,
      portalActiveOnly: true,
    });
  } catch (error) {
    if (error instanceof BuildingLegalDocumentError) {
      return null;
    }
    throw error;
  }
}

export default async function PortalBuildingLegalDocumentPreviewPage({ params }: PageProps) {
  const { buildingId, documentId } = await params;
  const { context, building } = await requireBuildingPortalAccess(buildingId);
  const document = await loadPreviewForPortal({ context, buildingId, documentId });

  if (!document) {
    notFound();
  }

  return (
    <OperatorPortalPageFrame
      title={document.titleHe}
      subtitle={building.displayName}
      breadcrumbs={[
        { label: "לוח בקרה", href: OPERATOR_PORTAL_ROUTES.home },
        { label: "בניינים", href: OPERATOR_PORTAL_ROUTES.buildings },
        { label: building.displayName, href: `${OPERATOR_PORTAL_ROUTES.buildings}/${buildingId}` },
        { label: "צפייה במסמך" },
      ]}
    >
      <p className={portalDocStyles.hint}>
        <Link className={portalDocStyles.viewLink} href={`/app/buildings/${buildingId}`}>
          חזרה לבניין
        </Link>
      </p>
      <BuildingLegalDocumentReadOnlyPreview
        document={document}
        pdfLinks={buildingLegalDocumentPdfUrls({
          audience: "portal",
          buildingId,
          documentId,
        })}
      />
    </OperatorPortalPageFrame>
  );
}
