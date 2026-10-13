"use client";

import { Button } from "@/components/ui/Button/Button";
import { logoutAction } from "@/modules/auth/actions/auth.actions";

export function LogoutButton() {
  return (
    <form action={logoutAction}>
      <Button type="submit" variant="secondary" size="sm">
        יציאה
      </Button>
    </form>
  );
}
