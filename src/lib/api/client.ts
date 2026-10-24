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

function cleanParams(
  params: Record<string, string | number | undefined | null>,
): Record<string, string | number> {
  const out: Record<string, string | number> = {};
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null || v === "") continue;
    out[k] = v;
  }
  return out;
}

export async function fetchFilters(): Promise<FiltersResponse> {
  const { data } = await api.get<FiltersResponse>("/main/utils/getFilters");
  return data;
}

export async function fetchPaginated(
  params: PaginatedParams,
): Promise<PaginatedResponse> {
  const { data } = await api.get<PaginatedResponse>("/main/paginated", {
    params: cleanParams({
      page: params.page ?? 1,
      limit: params.limit ?? 50,
      sortOrder: params.sortOrder,
      country: params.country,
      state: params.state,
      city: params.city,
      area: params.area,
      searchQuery: params.searchQuery,
      startDate: params.startDate,
      endDate: params.endDate,
    }),
  });
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
