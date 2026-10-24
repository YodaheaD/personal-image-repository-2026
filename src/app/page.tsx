import Link from "next/link";

export default function HomePage() {
  return (
    <div className="mx-auto h-full max-w-3xl overflow-y-auto px-4 py-16">
      <h1 className="text-2xl font-semibold tracking-tight text-[var(--secondary)] dark:text-[var(--primary)]">
        image Repo
      </h1>
      <p className="mt-3 max-w-prose text-[var(--muted-foreground)]">
        Personal photo gallery and journal backed by Azure Functions. Browse
        filtered images or open the notebook — more polish later.
      </p>
      <div className="mt-8 flex flex-wrap gap-3">
        <Link
          href="/images"
          className="rounded-md bg-[var(--primary)] px-4 py-2 text-sm font-medium text-white hover:opacity-90"
        >
          Open Images
        </Link>
        <Link
          href="/journal"
          className="rounded-md border border-[var(--border)] px-4 py-2 text-sm hover:bg-[var(--muted)]"
        >
          Open Journal
        </Link>
      </div>
    </div>
  );
}
