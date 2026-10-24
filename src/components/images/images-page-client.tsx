"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { CascadingFilters } from "@/components/images/cascading-filters";
import { DateRangeSearch } from "@/components/images/date-range-search";
import { ImageGallery } from "@/components/images/image-gallery";
import { Button } from "@/components/ui/button";
import {
  fetchFilters,
  fetchPaginated,
  imagesFromPaginated,
} from "@/lib/api/client";
import type {
  FilterBundle,
  FilterRow,
  ImageRecord,
  PaginatedParams,
} from "@/lib/api/types";
import type { SelectedFilters } from "@/lib/filters";

export function ImagesPageClient() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [filters, setFilters] = useState<FilterRow[]>([]);
  const [bundles, setBundles] = useState<
    FilterBundle[] | Record<string, string[]> | undefined
  >();
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
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const q = searchParams.get("searchQuery") ?? "";
    setSearchQuery(q);
  }, [searchParams]);

  useEffect(() => {
    let cancelled = false;
    fetchFilters()
      .then((res) => {
        if (cancelled) return;
        setFilters(res.filters ?? res.returnedFilters ?? []);
        setBundles(res.filterbundles);
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
    const params: PaginatedParams = {
      page,
      limit: 50,
      sortOrder,
      country: selected.country,
      state: selected.state,
      city: selected.city,
      area: selected.area,
      searchQuery: searchQuery || undefined,
      startDate: dateRange.startDate,
      endDate: dateRange.endDate,
    };
    try {
      const res = await fetchPaginated(params);
      setImages(imagesFromPaginated(res));
      const tp =
        res.totalPages ??
        (res.total && res.limit
          ? Math.max(1, Math.ceil(res.total / res.limit))
          : 1);
      setTotalPages(tp);
    } catch (err: unknown) {
      setImages([]);
      setError(err instanceof Error ? err.message : "Failed to load images");
    } finally {
      setLoading(false);
    }
  }, [page, sortOrder, selected, searchQuery, dateRange]);

  useEffect(() => {
    void loadImages();
  }, [loadImages]);

  function applyLocationFilters() {
    setPage(1);
    // loadImages runs via deps when page resets; if already 1, force reload
    if (page === 1) void loadImages();
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-6">
      <div>
        <h1 className="text-xl font-semibold text-[var(--foreground)]">
          Images
        </h1>
        <p className="mt-1 text-sm text-[var(--muted-foreground)]">
          Gallery with cascading location filters and date-taken range.
        </p>
      </div>

      <section className="space-y-3">
        <h2 className="text-sm font-medium">Location filters</h2>
        <CascadingFilters
          filters={filters}
          bundles={bundles}
          selected={selected}
          onChange={setSelected}
        />
        <div className="flex flex-wrap items-center gap-2">
          <Button type="button" variant="secondary" onClick={applyLocationFilters}>
            Apply filters
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              setSelected({});
              setSearchQuery("");
              setDateRange({});
              setPage(1);
              router.replace("/images");
            }}
          >
            Reset
          </Button>
          <label className="ml-auto flex items-center gap-2 text-sm">
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
        {searchQuery && (
          <p className="text-sm text-[var(--muted-foreground)]">
            Filter search: <span className="font-medium text-[var(--foreground)]">{searchQuery}</span>
          </p>
        )}
      </section>

      <DateRangeSearch
        disabled={loading}
        onSearch={(range) => {
          setDateRange(range);
          setPage(1);
        }}
      />

      {error && (
        <p className="rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-800 dark:bg-red-950/40 dark:text-red-200">
          {error}
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
    </div>
  );
}
