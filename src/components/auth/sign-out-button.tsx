"use client";

import { signOut } from "next-auth/react";
import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";

export function SignOutButton() {
  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      className="gap-1.5 text-[var(--muted-foreground)]"
      onClick={() => signOut({ callbackUrl: "/" })}
      aria-label="Sign out"
    >
      <LogOut className="h-4 w-4" aria-hidden />
      <span className="hidden sm:inline">Sign out</span>
    </Button>
  );
}
