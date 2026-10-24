/** Location hierarchy for FiltersTable cascade (parent → child). */
export const FILTER_LEVELS = [
  "country",
  "state",
  "country2",
  "city",
  "area",
  "neighborhood",
] as const;

export type FilterLevel = (typeof FILTER_LEVELS)[number];

/** Accordion display order on /images (per redesign). */
export const FILTER_ACCORDION_ORDER: FilterLevel[] = [
  "country",
  "state",
  "city",
  "area",
  "country2",
  "neighborhood",
];

export const FILTER_LEVEL_LABELS: Record<FilterLevel, string> = {
  country: "Country",
  state: "State",
  country2: "Country 2",
  city: "City",
  area: "Area",
  neighborhood: "Neighborhood",
};

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

/**
 * getFilters body is a flat level → string[] map (Functions contract).
 * Legacy `{ filters, filterbundles }` may still appear elsewhere.
 */
export type FiltersResponse = Partial<
  Record<FilterLevel, string[]>
> & {
  filters?: FilterRow[] | Record<string, string[]>;
  filterbundles?: FilterBundle[] | Record<string, string[]>;
  returnedFilters?: FilterRow[] | Record<string, string[]>;
  [key: string]: unknown;
};

export interface ImageRecord {
  PartitionKey?: string;
  RowKey?: string;
  name?: string;
  /** Prefer for gallery — compressedimages `.webp` (same as compressedUrl). */
  thumbnailUrl?: string;
  /** Prefer for gallery — compressedimages `.webp`. */
  compressedUrl?: string;
  /** Remapped server-side to compressed; UI should not prefer these. */
  blobUrl?: string;
  url?: string;
  dateTaken?: number | string;
  country?: string;
  state?: string;
  city?: string;
  area?: string;
  neighborhood?: string;
  country2?: string;
  /** Client-only resolved display URL (never HEIC). */
  _displayUrl?: string;
  [key: string]: unknown;
}

/**
 * Paginated query params.
 * Location fields: multi-select as comma-separated values
 * (OR within a level, AND across levels) — Functions IRF-8.
 */
export interface PaginatedParams {
  page?: number;
  limit?: number;
  sortOrder?: "asc" | "desc";
  country?: string | string[];
  state?: string | string[];
  city?: string | string[];
  area?: string | string[];
  country2?: string | string[];
  neighborhood?: string | string[];
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
  foldername?: string;
  tripName?: string;
  tripNumber?: number;
  text?: string;
  story?: string;
  images?: string[];
  [key: string]: unknown;
}

/** Raw returnList envelope — prefer parseJournalHierarchy(). */
export interface JournalListResponse {
  trips?: unknown;
  Trips?: unknown;
  data?: unknown;
  folders?: string[];
  names?: string[];
  entries?: JournalEntry[];
  [key: string]: unknown;
}

export interface JournalReturnTextParams {
  name: string;
  folder?: string;
  tripName?: string;
  tripNumber?: number;
}
