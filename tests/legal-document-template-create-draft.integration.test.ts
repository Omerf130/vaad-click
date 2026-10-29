import mongoose from "mongoose";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { SessionAuthStage } from "@/modules/auth/domain/session-types";
import { LegalDocumentTemplateCategory } from "@/modules/legal-document-templates/domain/legal-document-template-category";
import { LegalDocumentTemplate } from "@/modules/legal-document-templates/infra/legal-document-template.model";
import { LegalDocumentTemplateRevision } from "@/modules/legal-document-templates/infra/legal-document-template-revision.model";
import { createLegalDocumentTemplateDraft } from "@/modules/legal-document-templates/services/legal-document-template.service";
import { AccountStatus } from "@/modules/users/domain/account-status";
import { UserRole } from "@/modules/users/domain/user-role";
import { User } from "@/modules/users/infra/user.model";
import type { AuthenticatedContext } from "@/shared/auth/get-authenticated-context";
import { connectMongo } from "@/shared/db/connect";

const uri = process.env.MONGODB_URI;
const runIntegration = Boolean(uri && process.env.RUN_LEGAL_TEMPLATE_INTEGRATION === "1");

describe.runIf(runIntegration)("legal document template create empty draft integration", () => {
  let context: AuthenticatedContext;
  let templateId: string | null = null;
  let createdRevisionId: string | null = null;

  beforeAll(async () => {
    await connectMongo();
    const lawyer = await User.findOne({
      role: UserRole.LAWYER_ADMIN,
      accountStatus: AccountStatus.ACTIVE,
    }).lean();
    expect(lawyer).toBeTruthy();
    context = {
      user: {
        id: lawyer!._id.toString(),
        email: lawyer!.email ?? "lawyer@test",
        fullName: lawyer!.fullName ?? "Lawyer",
        role: UserRole.LAWYER_ADMIN,
        accountStatus: AccountStatus.ACTIVE,
      },
      session: {
        userId: lawyer!._id.toString(),
        authStage: SessionAuthStage.MFA_COMPLETE,
        expiresAt: new Date(Date.now() + 60_000),
        revokedAt: null,
      },
    };

    const template = await LegalDocumentTemplate.findOne({
      category: LegalDocumentTemplateCategory.POWER_OF_ATTORNEY,
    }).lean();
    expect(template).toBeTruthy();
    templateId = template!.templateId;
    if (template!.currentDraftRevisionId) {
      await LegalDocumentTemplateRevision.deleteMany({ templateId: template!.templateId });
      await LegalDocumentTemplate.updateOne(
        { templateId: template!.templateId },
        { $set: { currentDraftRevisionId: null, latestPublishedRevisionId: null } },
      );
    }
  });

  afterAll(async () => {
    if (templateId && createdRevisionId) {
      await LegalDocumentTemplateRevision.deleteOne({ revisionId: createdRevisionId });
      await LegalDocumentTemplate.updateOne(
        { templateId },
        { $set: { currentDraftRevisionId: null } },
      );
    }
    await mongoose.disconnect();
  });

  it("creates an empty-body draft revision", async () => {
    const result = await createLegalDocumentTemplateDraft({
      context,
      category: LegalDocumentTemplateCategory.POWER_OF_ATTORNEY,
      useDevPlaceholder: false,
    });
    createdRevisionId = result.revisionId;
    const revision = await LegalDocumentTemplateRevision.findOne({
      revisionId: result.revisionId,
    }).lean();
    expect(revision?.bodyText).toBe("");
    expect(revision?.isCurrentDraft).toBe(true);
  });
});
