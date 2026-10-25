"use client";

import { signIn } from "next-auth/react";
import { Button } from "@/components/ui/button";

export function SignInButton() {
  return (
    <Button
      type="button"
      size="lg"
      className="min-w-[12rem]"
      onClick={() =>
        signIn("microsoft-entra-id", { callbackUrl: "/images" })
      }
    >
      Sign in with Microsoft
    </Button>
  );
}
