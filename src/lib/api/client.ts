import axios, { type AxiosInstance } from "axios";
import type {
  FiltersResponse,
  PaginatedParams,
  PaginatedResponse,
} from "@/lib/api/types";
import {
  parseFilterCatalog,
  type FilterCatalog,
  type SelectedFilters,
} from "@/lib/filters";
import { parseReturnTextBody } from "@/lib/journal-hierarchy";

/** Browser Axios client → Next.js BFF proxy (injects function key server-side). */
export const api: AxiosInstance = axios.create({
  baseURL: "/api/functions",
  headers: { Accept: "application/json" },
  timeout: 60_000,
});

const LOCATION_KEYS = [
  "country",
  "state",
  "country2",
  "city",
  "area",
  "neighborhood",
] as const;

/**
 * Serialize paginated params for Functions `/main/paginated`:
 * location multi-select as repeated keys (also accepts comma-separated server-side).
 * OR within level, AND across levels. No `sortOrder` (RowKey / oldest-first).
 */
export function buildPaginatedSearchParams(
  params: PaginatedParams,
): URLSearchParams {
  const qs = new URLSearchParams();
  qs.set("page", String(params.page ?? 1));
  qs.set("limit", String(params.limit ?? 50));
  if (params.searchQuery) qs.set("searchQuery", params.searchQuery);
  if (params.startDate != null) qs.set("startDate", String(params.startDate));
  if (params.endDate != null) qs.set("endDate", String(params.endDate));
  // Debug passthrough for Functions page cache (skipCache=1 / true).
  if (params.skipCache != null && params.skipCache !== false && params.skipCache !== "") {
    const v = params.skipCache;
    qs.set(
      "skipCache",
      v === true || v === 1 || v === "1" || String(v).toLowerCase() === "true"
        ? "1"
        : String(v),
    );
  }

  for (const key of LOCATION_KEYS) {
    const raw = params[key];
    if (raw == null || raw === "") continue;
    const values = Array.isArray(raw)
      ? raw
      : String(raw)
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean);
    for (const v of values) qs.append(key, v);
  }
  return qs;
}

export async function fetchFilters(): Promise<FiltersResponse> {
  const { data } = await api.get<FiltersResponse>("/main/utils/getFilters");
  return data;
}

/**
 * Cascade options for lower levels given current location multi-select.
 * GET /main/utils/cascadeFilters?country=Spain&city=Madrid…
 * → { state?: string[], country2?: string[], city?: string[], … }
 * (descendants under selected parents; OR within level).
 * Returns null if the endpoint is unavailable (404) so UI can fall back to bundles.
 */
export async function fetchCascadeFilters(
  selected: SelectedFilters,
): Promise<FilterCatalog | null> {
  const qs = new URLSearchParams();
  for (const key of LOCATION_KEYS) {
    const values = selected[key];
    if (!values?.length) continue;
    for (const v of values) qs.append(key, v);
  }
  if ([...qs.keys()].length === 0) return {};

  try {
    const { data, status } = await api.get<unknown>(
      `/main/utils/cascadeFilters?${qs.toString()}`,
      { validateStatus: (s) => (s >= 200 && s < 300) || s === 404 },
    );
    if (status === 404 || data == null) return null;
    return parseFilterCatalog(data);
  } catch {
    return null;
  }
}

export async function fetchPaginated(
  params: PaginatedParams,
): Promise<PaginatedResponse> {
  const qs = buildPaginatedSearchParams(params);
  const { data } = await api.get<PaginatedResponse>(
    `/main/paginated?${qs.toString()}`,
  );
  return data;
}

export function imagesFromPaginated(res: PaginatedResponse) {
  return res.data ?? res.images ?? res.items ?? [];
}

/**
 * Ask Functions to materialize missing thumbnailimages blobs for the given
 * webp basenames (manual Ensure thumbs control; not called on page load).
 * POST /main/ensureThumbnails `{ names: string[] }`.
 * Failures are ignored — thumbs may 404 until ensure/backfill catches up.
 */
export async function ensureThumbnails(names: string[]): Promise<void> {
  const unique = [...new Set(names.map((n) => n.trim()).filter(Boolean))];
  if (unique.length === 0) return;
  try {
    await api.post(
      "/main/ensureThumbnails",
      { names: unique },
      {
        // Don't surface ensure errors to the gallery; 4xx/5xx are fine.
        validateStatus: () => true,
        timeout: 30_000,
      },
    );
  } catch {
    /* ignore network / proxy failures */
  }
}

/** Journal paths — Functions PR #5 contract. */
export async function journalReturnList(): Promise<unknown> {
  const { data } = await api.get<unknown>("/journal/returnList");
  return data;
}

/**
 * GET /journal/returnText?foldername&name → [text, images] or 204.
 */
export async function journalReturnText(params: {
  foldername: string;
  name: string;
}): Promise<{ text: string; images: string[]; empty: boolean }> {
  const { data, status } = await api.get<unknown>("/journal/returnText", {
    params: { foldername: params.foldername, name: params.name },
    validateStatus: (s) => (s >= 200 && s < 300) || s === 204,
  });
  if (status === 204 || data == null || data === "") {
    return { text: "", images: [], empty: true };
  }
  const parsed = parseReturnTextBody(data);
  return { ...parsed, empty: false };
}

export async function journalEditStory(payload: {
  foldername: string;
  name: string;
  data: string;
}): Promise<unknown> {
  const { data } = await api.post("/journal/editStory", payload);
  return data;
}

export async function journalAddName(payload: {
  name: string;
  folder?: string;
  foldername?: string;
}): Promise<unknown> {
  const { data } = await api.post("/journal/addname", {
    name: payload.name,
    folder: payload.foldername ?? payload.folder,
    foldername: payload.foldername ?? payload.folder,
  });
  return data;
}

export async function journalDeleteName(payload: {
  name: string;
  foldername?: string;
}): Promise<unknown> {
  const { data } = await api.post("/journal/deleteName", payload);
  return data;
}

export async function journalMakeFolder(payload: {
  folder: string;
}): Promise<unknown> {
  const { data } = await api.post("/journal/makefolder", payload);
  return data;
}

export async function journalAddImages(payload: {
  name: string;
  images: string[];
}): Promise<unknown> {
  const { data } = await api.post("/journal/addImages", payload);
  return data;
}

export async function journalRemoveImages(payload: {
  name: string;
  images: string[];
}): Promise<unknown> {
  const { data } = await api.post("/journal/removeImages", payload);
  return data;
}
