import type { Metadata } from "next";
import { AuthShell } from "@/components/auth/AuthShell/AuthShell";
import { LoginForm } from "@/components/auth/LoginForm";
import { sanitizeReturnPath } from "@/shared/security/safe-redirect";
import { buildPublicPageMetadata } from "@/shared/seo/build-public-page-metadata";

export const metadata: Metadata = buildPublicPageMetadata({
  title: "כניסה",
  description: "כניסה למערכת ועד בקליק",
  path: "/login",
});

type LoginPageProps = {
  searchParams: Promise<{ returnTo?: string; setup?: string }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const returnTo = sanitizeReturnPath(params.returnTo ?? null);
  const setupComplete = params.setup === "complete";

  return (
    <AuthShell
      title="כניסה למערכת"
      subtitle={
        setupComplete
          ? "הסיסמה נשמרה. התחברו עם הדוא\"ל והסיסמה שבחרתם."
          : "הזינו דוא\"ל וסיסמה לחשבון הקיים."
      }
    >
      <LoginForm returnTo={returnTo} />
    </AuthShell>
  );
}
