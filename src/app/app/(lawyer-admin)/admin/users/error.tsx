"use client";

import Link from "next/link";

import { AdminPageFrame } from "@/modules/admin/components/AdminPageFrame";

export default function AdminUsersError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <AdminPageFrame
      title="משתמשים"
      subtitle="לא ניתן לטעון את רשימת המשתמשים כרגע."
    >
      <p role="alert">אירעה שגיאה בטעינת הנתונים. נסו שוב.</p>
      <p>
        <button type="button" onClick={reset}>
          ניסיון חוזר
        </button>{" "}
        · <Link href="/app/admin">חזרה לסקירה</Link>
      </p>
    </AdminPageFrame>
  );
}
