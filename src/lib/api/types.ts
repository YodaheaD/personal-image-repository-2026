/** Location hierarchy levels used by FiltersTable + cascading UI. */
export const FILTER_LEVELS = [
  "country",
  "state",
  "country2",
  "city",
  "area",
  "neighborhood",
] as const;

export type FilterLevel = (typeof FILTER_LEVELS)[number];

/** Levels accepted by GET /api/main/paginated. */
export type PaginatedLocationKey = "country" | "state" | "city" | "area";

export interface FilterRow {
  PartitionKey?: string;
  RowKey?: string;
  name: string;
  parentLevel?: string | null;
  parentName?: string | null;
  [key: string]: unknown;
}

export interface FilterBundle {
  PartitionKey?: string;
  RowKey?: string;
  name?: string;
  level?: string;
  children?: string[];
  [key: string]: unknown;
}

export interface FiltersResponse {
  filters?: FilterRow[];
  filterbundles?: FilterBundle[] | Record<string, string[]>;
  returnedFilters?: FilterRow[];
  [key: string]: unknown;
}

export interface ImageRecord {
  PartitionKey?: string;
  RowKey?: string;
  name?: string;
  blobUrl?: string;
  url?: string;
  thumbnailUrl?: string;
  dateTaken?: number | string;
  country?: string;
  state?: string;
  city?: string;
  area?: string;
  neighborhood?: string;
  country2?: string;
  [key: string]: unknown;
}

export interface PaginatedParams {
  page?: number;
  limit?: number;
  sortOrder?: "asc" | "desc";
  country?: string;
  state?: string;
  city?: string;
  area?: string;
  searchQuery?: string;
  /** Inclusive lower bound on dateTaken — epoch ms UTC */
  startDate?: number;
  /** Inclusive upper bound on dateTaken — epoch ms UTC */
  endDate?: number;
}

export interface PaginatedResponse {
  data?: ImageRecord[];
  images?: ImageRecord[];
  items?: ImageRecord[];
  page?: number;
  limit?: number;
  total?: number;
  totalPages?: number;
  returnedFilters?: FilterRow[];
  [key: string]: unknown;
}

export interface JournalEntry {
  name: string;
  folder?: string;
  text?: string;
  story?: string;
  images?: string[];
  [key: string]: unknown;
}

export interface JournalListResponse {
  folders?: string[];
  names?: string[];
  entries?: JournalEntry[];
  data?: JournalEntry[] | Record<string, unknown>;
  [key: string]: unknown;
}
