import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";
import { AuthShell } from "@/components/auth/AuthShell/AuthShell";
import { SetInitialLawyerPasswordForm } from "@/components/auth/SetInitialLawyerPasswordForm";
import { validateLawyerAdminSetupToken } from "@/modules/auth/services/lawyer-admin-setup-token.service";
import { getAppEnv } from "@/shared/config/env.server";

type SetupPageProps = {
  searchParams: Promise<{ token?: string }>;
};

export default async function InitialLawyerPasswordSetupPage({
  searchParams,
}: SetupPageProps) {
  if (getAppEnv() === "production") {
    notFound();
  }

  const params = await searchParams;
  const rawToken = params.token?.trim();
  if (!rawToken) {
    notFound();
  }

  const pending = await validateLawyerAdminSetupToken(rawToken);
  if (!pending) {
    notFound();
  }

  return (
    <AuthShell
      title="הגדרת סיסמה — מנהל משרד"
      subtitle={`חשבון: ${pending.fullName} (${pending.email}). הקישור חד-פעמי ותקף לזמן מוגבל. בחר סיסמה חזקה (לפחות 12 תווים).`}
    >
      <SetInitialLawyerPasswordForm setupToken={rawToken} />
    </AuthShell>
  );
}
