"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Cloud, Search } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { Input } from "@/components/ui/input";
import { fetchFilters } from "@/lib/api/client";
import {
  allFilterValues,
  matchFilterValues,
  parseFilterCatalog,
  type FilterCatalog,
} from "@/lib/filters";
import { cn } from "@/lib/utils";

const LINKS = [
  { href: "/images", label: "Images" },
  { href: "/journal", label: "Journal" },
] as const;

export function Navbar({ signedIn }: { signedIn: boolean }) {
  const pathname = usePathname();
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [catalog, setCatalog] = useState<FilterCatalog>({});
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!signedIn) return;
    let cancelled = false;
    fetchFilters()
      .then((res) => {
        if (cancelled) return;
        setCatalog(parseFilterCatalog(res));
      })
      .catch(() => {
        /* filters unavailable offline — search suggestions empty */
      });
    return () => {
      cancelled = true;
    };
  }, [signedIn]);

  const values = useMemo(() => allFilterValues(catalog), [catalog]);
  const matches = useMemo(
    () => (query.trim() ? matchFilterValues(values, query).slice(0, 12) : []),
    [values, query],
  );

  function runSearch(term: string) {
    const q = term.trim();
    setOpen(false);
    if (!q) {
      router.push("/images");
      return;
    }
    router.push(`/images?searchQuery=${encodeURIComponent(q)}`);
  }

  // Unauthenticated shell: brand only (landing owns the CTA)
  if (!signedIn) {
    return (
      <header className="shrink-0 border-b border-[var(--border)] bg-[var(--background)]">
        <nav className="mx-auto flex max-w-7xl items-center px-4 py-3">
          <div className="flex items-center gap-2 text-[var(--secondary)] dark:text-[var(--primary)]">
            <Cloud className="h-6 w-6" aria-hidden />
            <span className="text-base font-semibold tracking-tight">
              image Repo
            </span>
          </div>
        </nav>
      </header>
    );
  }

  return (
    <header className="shrink-0 border-b border-[var(--border)] bg-[var(--background)]">
      <nav className="mx-auto flex max-w-7xl flex-wrap items-center gap-3 px-4 py-3">
        <Link
          href="/images"
          className="flex shrink-0 items-center gap-2 text-[var(--secondary)] dark:text-[var(--primary)]"
        >
          <Cloud className="h-6 w-6" aria-hidden />
          <span className="text-base font-semibold tracking-tight">
            image Repo
          </span>
        </Link>

        <div className="relative min-w-[12rem] flex-1 max-w-md">
          <Search
            className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted-foreground)]"
            aria-hidden
          />
          <Input
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            onBlur={() => {
              // allow click on suggestion
              window.setTimeout(() => setOpen(false), 150);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                runSearch(query);
              }
            }}
            placeholder="Search filters…"
            className="pl-8"
            aria-label="Search filter values"
          />
          {open && matches.length > 0 && (
            <ul className="absolute z-40 mt-1 max-h-60 w-full overflow-auto rounded-md border border-[var(--border)] bg-[var(--background)] py-1 shadow-sm">
              {matches.map((m) => (
                <li key={m}>
                  <button
                    type="button"
                    className="block w-full px-3 py-1.5 text-left text-sm hover:bg-[var(--muted)]"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => {
                      setQuery(m);
                      runSearch(m);
                    }}
                  >
                    {m}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="ml-auto flex items-center gap-1 sm:gap-2">
          {LINKS.map((link) => {
            const active = pathname.startsWith(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "rounded-md px-3 py-1.5 text-sm",
                  active
                    ? "bg-[var(--muted)] font-medium text-[var(--secondary)] dark:text-[var(--primary)]"
                    : "text-[var(--foreground)] hover:bg-[var(--muted)]",
                )}
              >
                {link.label}
              </Link>
            );
          })}
          <SignOutButton />
        </div>
      </nav>
    </header>
  );
}
