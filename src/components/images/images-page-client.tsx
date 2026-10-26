"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";
import { FilterSidebar } from "@/components/images/filter-sidebar";
import type { DateRangeResult } from "@/components/images/date-range-search";
import { ImageGallery } from "@/components/images/image-gallery";
import { Button } from "@/components/ui/button";
import {
  fetchCascadeFilters,
  fetchFilters,
  fetchPaginated,
  imagesFromPaginated,
} from "@/lib/api/client";
import type { ImageRecord, PaginatedParams } from "@/lib/api/types";
import {
  hasLocationSelection,
  parseFilterBundles,
  parseFilterCatalog,
  pruneInvalidDescendants,
  selectionsEqual,
  type FilterBundles,
  type FilterCatalog,
  type SelectedFilters,
} from "@/lib/filters";
import { filterDisplayableImages } from "@/lib/image-urls";
import { resolvePaginationNav } from "@/lib/pagination";
import { cn } from "@/lib/utils";

const PAGE_LIMIT = 50;

export function ImagesPageClient() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [catalog, setCatalog] = useState<FilterCatalog>({});
  const [bundles, setBundles] = useState<FilterBundles>({});
  const [cascadeAllowed, setCascadeAllowed] = useState<FilterCatalog>({});
  const [selected, setSelected] = useState<SelectedFilters>({});
  const [searchQuery, setSearchQuery] = useState(
    () => searchParams.get("searchQuery") ?? "",
  );
  const [dateRange, setDateRange] = useState<{
    startDate?: number;
    endDate?: number;
  }>({});
  const [page, setPage] = useState(1);
  const [images, setImages] = useState<ImageRecord[]>([]);
  const [sasToken, setSasToken] = useState<string | null>(null);
  const [hiddenCount, setHiddenCount] = useState(0);
  const [hasNextPage, setHasNextPage] = useState(false);
  const [hasPreviousPage, setHasPreviousPage] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const skipCacheParam = searchParams.get("skipCache");
  const skipCache =
    skipCacheParam === "1" ||
    skipCacheParam?.toLowerCase() === "true" ||
    skipCacheParam === "yes"
      ? true
      : undefined;

  useEffect(() => {
    setSearchQuery(searchParams.get("searchQuery") ?? "");
  }, [searchParams]);

  useEffect(() => {
    let cancelled = false;
    fetchFilters()
      .then((res) => {
        if (cancelled) return;
        setCatalog(parseFilterCatalog(res));
        setBundles(parseFilterBundles(res));
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : "Failed to load filters",
          );
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Prefer cascadeFilters API; fall back to client walk of getFilters.bundles.
  const selectedKey = JSON.stringify(selected);
  useEffect(() => {
    let cancelled = false;
    if (!hasLocationSelection(selected)) {
      setCascadeAllowed({});
      return;
    }
    fetchCascadeFilters(selected)
      .then((allowed) => {
        if (cancelled) return;
        const cascadeOpts =
          allowed == null
            ? { bundles }
            : { bundles, cascadeAllowed: allowed };
        if (allowed == null) setCascadeAllowed({});
        else setCascadeAllowed(allowed);

        setSelected((prev) => {
          const pruned = pruneInvalidDescendants(
            prev,
            "country",
            catalog,
            cascadeOpts,
          );
          return selectionsEqual(prev, pruned) ? prev : pruned;
        });
      })
      .catch(() => {
        if (!cancelled) setCascadeAllowed({});
      });
    return () => {
      cancelled = true;
    };
    // selectedKey avoids identity churn; re-run when catalog/bundles load.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedKey, catalog, bundles]);

  const loadImages = useCallback(async () => {
    setLoading(true);
    setError(null);

    const useLocation = hasLocationSelection(selected);
    const useDate =
      !useLocation &&
      (dateRange.startDate != null || dateRange.endDate != null);

    const params: PaginatedParams = {
      page,
      limit: PAGE_LIMIT,
      searchQuery: searchQuery || undefined,
      skipCache,
      ...(useLocation
        ? {
            country: selected.country,
            state: selected.state,
            city: selected.city,
            area: selected.area,
            country2: selected.country2,
            neighborhood: selected.neighborhood,
          }
        : {}),
      ...(useDate
        ? {
            startDate: dateRange.startDate,
            endDate: dateRange.endDate,
          }
        : {}),
    };

    try {
      const res = await fetchPaginated(params);
      const raw = imagesFromPaginated(res);
      const pageSas =
        typeof res.sasToken === "string" && res.sasToken.trim()
          ? res.sasToken.trim()
          : null;
      const { displayable, hiddenHeicOrMissing } = filterDisplayableImages(
        raw,
        pageSas,
      );
      setSasToken(pageSas);
      setImages(displayable);
      setHiddenCount(hiddenHeicOrMissing);
      const nav = resolvePaginationNav(res, {
        requestedLimit: PAGE_LIMIT,
        pageItemCount: raw.length,
        currentPage: page,
      });
      setHasNextPage(nav.hasNextPage);
      setHasPreviousPage(nav.hasPreviousPage);
    } catch (err: unknown) {
      setImages([]);
      setSasToken(null);
      setHiddenCount(0);
      setHasNextPage(false);
      setHasPreviousPage(false);
      setError(err instanceof Error ? err.message : "Failed to load images");
    } finally {
      setLoading(false);
    }
  }, [page, selected, searchQuery, dateRange, skipCache]);

  useEffect(() => {
    void loadImages();
  }, [loadImages]);

  function onLocationChange(next: SelectedFilters) {
    setSelected(next);
    if (hasLocationSelection(next)) {
      setDateRange({});
    }
    setPage(1);
  }

  function onDateSearch(range: DateRangeResult) {
    const hasDate = range.startDate != null || range.endDate != null;
    if (hasDate) {
      setSelected({});
    }
    setDateRange(range);
    setPage(1);
  }

  function resetAll() {
    setSelected({});
    setSearchQuery("");
    setDateRange({});
    setPage(1);
    router.replace("/images");
  }

  const hasDateRange =
    dateRange.startDate != null || dateRange.endDate != null;

  return (
    <div className="flex h-full min-h-0 overflow-hidden">
      <div className="flex shrink-0 flex-col border-r border-[var(--border)] bg-[var(--background)]">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="m-1"
          aria-label={sidebarOpen ? "Collapse filters" : "Expand filters"}
          aria-expanded={sidebarOpen}
          onClick={() => setSidebarOpen((o) => !o)}
        >
          {sidebarOpen ? (
            <PanelLeftClose className="h-5 w-5" />
          ) : (
            <PanelLeftOpen className="h-5 w-5" />
          )}
        </Button>
      </div>

      <aside
        className={cn(
          "flex min-h-0 shrink-0 flex-col overflow-hidden border-r border-[var(--border)] bg-[var(--background)]",
          sidebarOpen ? "h-full w-72 sm:w-80" : "w-0 border-r-0",
        )}
        aria-hidden={!sidebarOpen}
      >
        {sidebarOpen && (
          <FilterSidebar
            catalog={catalog}
            bundles={bundles}
            cascadeAllowed={cascadeAllowed}
            selected={selected}
            onSelectedChange={onLocationChange}
            onDateSearch={onDateSearch}
            onReset={resetAll}
            disabled={loading}
            hasDateRange={hasDateRange}
          />
        )}
      </aside>

      <section className="flex min-h-0 min-w-0 flex-1 flex-col px-3 py-4 sm:px-4">
        <div className="mb-3 flex shrink-0 flex-wrap items-end justify-between gap-2">
          <div>
            <h1 className="text-xl font-semibold text-[var(--foreground)]">
              Images
            </h1>
            {searchQuery && (
              <p className="mt-1 text-sm text-[var(--muted-foreground)]">
                Filter search:{" "}
                <span className="font-medium text-[var(--foreground)]">
                  {searchQuery}
                </span>
              </p>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-1">
            {hasPreviousPage && (
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="h-9 w-9"
                disabled={loading}
                aria-label="First page"
                onClick={() => setPage(1)}
              >
                <ChevronsLeft className="h-4 w-4" />
              </Button>
            )}
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="h-9 w-9"
              disabled={!hasPreviousPage || loading}
              aria-label="Previous page"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="min-w-[4rem] px-1 text-center text-sm tabular-nums text-[var(--muted-foreground)]">
              Page {page}
            </span>
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="h-9 w-9"
              disabled={!hasNextPage || loading}
              aria-label="Next page"
              onClick={() => setPage((p) => p + 1)}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {error && (
          <p className="mb-3 shrink-0 rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-800 dark:bg-red-950/40 dark:text-red-200">
            {error}
          </p>
        )}

        {hiddenCount > 0 && (
          <p className="mb-2 shrink-0 text-xs text-[var(--muted-foreground)]">
            Hid {hiddenCount} item
            {hiddenCount === 1 ? "" : "s"} with HEIC/original-only URLs (gallery
            uses thumbnailimages / compressedimages only).
          </p>
        )}

        <div className="min-h-0 flex-1 overflow-y-auto">
          {loading ? (
            <p className="text-sm text-[var(--muted-foreground)]">Loading…</p>
          ) : (
            <ImageGallery images={images} sasToken={sasToken} />
          )}
        </div>
      </section>
    </div>
  );
}
