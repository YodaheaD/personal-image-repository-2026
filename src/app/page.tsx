import { Cloud } from "lucide-react";
import { SignInButton } from "@/components/auth/sign-in-button";

export default function LandingPage() {
  return (
    <div className="relative flex h-full items-center justify-center overflow-y-auto px-4 py-16">
      {/* Subtle atmosphere — slate/blue wash matching existing tokens */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 landing-bg"
      />

      <div className="relative mx-auto flex w-full max-w-lg flex-col items-center text-center">
        <div className="flex items-center gap-3 text-[var(--secondary)] dark:text-[var(--primary)]">
          <Cloud className="h-10 w-10 shrink-0 sm:h-12 sm:w-12" aria-hidden />
          <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
            image Repo
          </h1>
        </div>

        <p className="mt-4 max-w-md text-base text-[var(--muted-foreground)] sm:text-lg">
          Personal photo gallery and journal. Sign in with your Microsoft
          account to continue.
        </p>

        <div className="mt-10">
          <SignInButton />
        </div>
      </div>
    </div>
  );
}
