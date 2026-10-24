"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { PanelLeftClose, PanelLeftOpen } from "lucide-react";
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
import { cn } from "@/lib/utils";

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
        // getFilters returns flat { country: string[], ... } — not { filters }
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
      limit: 50,
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
      const tp =
        res.totalPages ??
        (res.total && res.limit
          ? Math.max(1, Math.ceil(res.total / res.limit))
          : 1);
      setTotalPages(tp);
    } catch (err: unknown) {
      setImages([]);
      setHiddenCount(0);
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
    <div className="flex min-h-[calc(100vh-3.5rem)]">
      {/* Persistent toggle — always visible */}
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
          "shrink-0 overflow-hidden border-r border-[var(--border)] bg-[var(--background)]",
          sidebarOpen ? "w-72 sm:w-80" : "w-0 border-r-0",
        )}
        aria-hidden={!sidebarOpen}
      >
        {sidebarOpen && (
          <FilterSidebar
            catalog={catalog}
            selected={selected}
            onSelectedChange={onLocationChange}
            onDateSearch={onDateSearch}
            onReset={resetAll}
            disabled={loading}
            hasDateRange={hasDateRange}
          />
        )}
      </aside>

      <section className="min-w-0 flex-1 space-y-4 px-3 py-4 sm:px-4">
        <div className="flex flex-wrap items-end justify-between gap-2">
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
        </div>

        {error && (
          <p className="rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-800 dark:bg-red-950/40 dark:text-red-200">
            {error}
          </p>
        )}

        {hiddenCount > 0 && (
          <p className="text-xs text-[var(--muted-foreground)]">
            Hid {hiddenCount} item
            {hiddenCount === 1 ? "" : "s"} with HEIC/original-only URLs (gallery
            uses compressedimages only).
          </p>
        )}

        {loading ? (
          <p className="text-sm text-[var(--muted-foreground)]">Loading…</p>
        ) : (
          <ImageGallery images={images} />
        )}

        <div className="flex items-center justify-center gap-3 pt-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={page <= 1 || loading}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            Previous
          </Button>
          <span className="text-sm text-[var(--muted-foreground)]">
            Page {page} / {totalPages}
          </span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={page >= totalPages || loading}
            onClick={() => setPage((p) => p + 1)}
          >
            Next
          </Button>
        </div>
      </section>
    </div>
  );
}
