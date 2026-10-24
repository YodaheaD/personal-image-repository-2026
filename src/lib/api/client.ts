import axios, { type AxiosInstance } from "axios";
import type {
  FiltersResponse,
  JournalEntry,
  JournalListResponse,
  PaginatedParams,
  PaginatedResponse,
} from "@/lib/api/types";

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
 * Serialize paginated params for Functions PR #4:
 * location multi-select as repeated keys (also accepts comma-separated server-side).
 * OR within level, AND across levels.
 */
export function buildPaginatedSearchParams(
  params: PaginatedParams,
): URLSearchParams {
  const qs = new URLSearchParams();
  qs.set("page", String(params.page ?? 1));
  qs.set("limit", String(params.limit ?? 50));
  if (params.sortOrder) qs.set("sortOrder", params.sortOrder);
  if (params.searchQuery) qs.set("searchQuery", params.searchQuery);
  if (params.startDate != null) qs.set("startDate", String(params.startDate));
  if (params.endDate != null) qs.set("endDate", String(params.endDate));

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

/** Journal paths mirror Functions handlers (CRUD). */
export async function journalReturnList(): Promise<JournalListResponse> {
  const { data } = await api.get<JournalListResponse>("/journal/returnList");
  return data;
}

export async function journalReturnText(name: string): Promise<JournalEntry> {
  const { data } = await api.get<JournalEntry>("/journal/returnText", {
    params: { name },
  });
  return data;
}

export async function journalEditStory(payload: {
  name: string;
  text?: string;
  story?: string;
}): Promise<unknown> {
  const { data } = await api.post("/journal/editStory", payload);
  return data;
}

export async function journalAddName(payload: {
  name: string;
  folder?: string;
}): Promise<unknown> {
  const { data } = await api.post("/journal/addname", payload);
  return data;
}

export async function journalDeleteName(payload: {
  name: string;
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
