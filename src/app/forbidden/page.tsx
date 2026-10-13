import Link from "next/link";
import { AuthShell } from "@/components/auth/AuthShell/AuthShell";
import { ButtonLink } from "@/components/ui/Button/ButtonLink";

type ForbiddenPageProps = {
  searchParams: Promise<{ reason?: string }>;
};

export default async function ForbiddenPage({ searchParams }: ForbiddenPageProps) {
  const params = await searchParams;
  const reason = params.reason;

  let message =
    "אין לך הרשאה לצפות בדף זה. אם אתה חושב שמדובר בטעות, פנה למנהל המערכת.";

  if (reason === "production-mfa-required") {
    message =
      "נדרש אימות MFA מלא לפני גישה ליישום ב-production. דרישה זו נדחתה לפיתוח בלבד ולא בוטלה ל-production.";
  } else if (reason === "role") {
    message = "הדף מיועד לסוג חשבון אחר.";
  }

  return (
    <AuthShell title="גישה נדחתה">
      <p>{message}</p>
      <p style={{ marginTop: "1.5rem" }}>
        <ButtonLink href="/app" variant="secondary">
          חזרה לאזור המחובר
        </ButtonLink>{" "}
        <Link href="/">דף הבית</Link>
      </p>
    </AuthShell>
  );
}
