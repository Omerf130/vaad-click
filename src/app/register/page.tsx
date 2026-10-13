import type { Metadata } from "next";
import { AuthShell } from "@/components/auth/AuthShell/AuthShell";
import { RegisterForm } from "@/components/auth/RegisterForm";
import { buildPublicPageMetadata } from "@/shared/seo/build-public-page-metadata";

export const metadata: Metadata = buildPublicPageMetadata({
  title: "הרשמה",
  description: "הרשמה לנציגות בית משותף או לחברת ניהול",
  path: "/register",
});

export default function RegisterPage() {
  return (
    <AuthShell
      title="יצירת חשבון"
      subtitle="הרשמה לנציגות בית משותף או לחברת ניהול. לאחר ההרשמה תוכלו להתחבר — שיוך לבניין יתווסף בשלבים הבאים."
    >
      <RegisterForm />
    </AuthShell>
  );
}
