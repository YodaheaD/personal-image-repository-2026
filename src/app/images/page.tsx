import { Suspense } from "react";
import { ImagesPageClient } from "@/components/images/images-page-client";

export default function ImagesPage() {
  return (
    <Suspense
      fallback={
        <p className="px-4 py-6 text-sm text-[var(--muted-foreground)]">
          Loading…
        </p>
      }
    >
      <ImagesPageClient />
    </Suspense>
  );
}
