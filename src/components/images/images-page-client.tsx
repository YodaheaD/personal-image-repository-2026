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
  fetchFilters,
  fetchPaginated,
  imagesFromPaginated,
} from "@/lib/api/client";
import type { ImageRecord, PaginatedParams } from "@/lib/api/types";
import {
  hasLocationSelection,
  parseFilterCatalog,
  type FilterCatalog,
  type SelectedFilters,
} from "@/lib/filters";
import { filterDisplayableImages } from "@/lib/image-urls";
import { resolveTotalPages } from "@/lib/pagination";
import { cn } from "@/lib/utils";

const PAGE_LIMIT = 50;

export function ImagesPageClient() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [catalog, setCatalog] = useState<FilterCatalog>({});
  const [selected, setSelected] = useState<SelectedFilters>({});
  const [searchQuery, setSearchQuery] = useState(
    () => searchParams.get("searchQuery") ?? "",
  );
  const [dateRange, setDateRange] = useState<{
    startDate?: number;
    endDate?: number;
  }>({});
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(1);
  const [images, setImages] = useState<ImageRecord[]>([]);
  const [hiddenCount, setHiddenCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setSearchQuery(searchParams.get("searchQuery") ?? "");
  }, [searchParams]);

  useEffect(() => {
    let cancelled = false;
    fetchFilters()
      .then((res) => {
        if (cancelled) return;
        setCatalog(parseFilterCatalog(res));
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
      sortOrder,
      searchQuery: searchQuery || undefined,
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
      const { displayable, hiddenHeicOrMissing } =
        filterDisplayableImages(raw);
      setImages(displayable);
      setHiddenCount(hiddenHeicOrMissing);
      setTotalPages(
        resolveTotalPages(res as Record<string, unknown>, {
          requestedLimit: PAGE_LIMIT,
          pageItemCount: raw.length,
          currentPage: page,
        }),
      );
    } catch (err: unknown) {
      setImages([]);
      setHiddenCount(0);
      setTotalPages(1);
      setError(err instanceof Error ? err.message : "Failed to load images");
    } finally {
      setLoading(false);
    }
  }, [page, sortOrder, selected, searchQuery, dateRange]);

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
    <div className="flex h-[calc(100vh-3.5rem)] min-h-0 overflow-hidden">
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
          "min-h-0 shrink-0 overflow-hidden border-r border-[var(--border)] bg-[var(--background)]",
          sidebarOpen ? "w-72 sm:w-80" : "w-0 border-r-0",
        )}
        aria-hidden={!sidebarOpen}
      >
        {sidebarOpen && (
          <div className="h-full overflow-y-auto">
            <FilterSidebar
              catalog={catalog}
              selected={selected}
              onSelectedChange={onLocationChange}
              onDateSearch={onDateSearch}
              onReset={resetAll}
              disabled={loading}
              hasDateRange={hasDateRange}
            />
          </div>
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

          <div className="flex flex-wrap items-center gap-2">
            <label className="flex items-center gap-2 text-sm">
              Sort
              <select
                className="h-9 rounded-md border border-[var(--border)] bg-[var(--background)] px-2 text-sm"
                value={sortOrder}
                onChange={(e) => {
                  setSortOrder(e.target.value as "asc" | "desc");
                  setPage(1);
                }}
              >
                <option value="desc">Newest first</option>
                <option value="asc">Oldest first</option>
              </select>
            </label>

            <div className="flex items-center gap-1">
              {page > 1 && (
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
                disabled={page <= 1 || loading}
                aria-label="Previous page"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="min-w-[5.5rem] px-1 text-center text-sm tabular-nums text-[var(--muted-foreground)]">
                Page {page} / {totalPages}
              </span>
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="h-9 w-9"
                disabled={page >= totalPages || loading}
                aria-label="Next page"
                onClick={() => setPage((p) => p + 1)}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
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
            uses compressedimages only).
          </p>
        )}

        <div className="min-h-0 flex-1 overflow-y-auto">
          {loading ? (
            <p className="text-sm text-[var(--muted-foreground)]">Loading…</p>
          ) : (
            <ImageGallery images={images} />
          )}
        </div>
      </section>
    </div>
  );
}
