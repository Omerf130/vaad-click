import { AuthShell } from "@/components/auth/AuthShell/AuthShell";
import { ButtonLink } from "@/components/ui/Button/ButtonLink";

export default function UnauthorizedPage() {
  return (
    <AuthShell title="נדרשת כניסה">
      <p>יש להתחבר כדי לצפות בדף המבוקש.</p>
      <p style={{ marginTop: "1.5rem" }}>
        <ButtonLink href="/login" variant="primary">
          מעבר לכניסה
        </ButtonLink>
      </p>
    </AuthShell>
  );
}
