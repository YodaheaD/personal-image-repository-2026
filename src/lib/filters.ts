import type { FilterLevel } from "@/lib/api/types";
import { FILTER_LEVELS } from "@/lib/api/types";

/** Multi-select location filters. */
export type SelectedFilters = Partial<Record<FilterLevel, string[]>>;

/**
 * Flat getFilters catalog — Functions contract:
 * `{ country: string[], state: string[], ... }`
 * (not `{ filters, filterbundles }`).
 */
export type FilterCatalog = Partial<Record<FilterLevel, string[]>>;

function isFilterLevel(key: string): key is FilterLevel {
  return (FILTER_LEVELS as readonly string[]).includes(key);
}

/** Normalize getFilters / returnedFilters payloads into a flat catalog. */
export function parseFilterCatalog(payload: unknown): FilterCatalog {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return {};
  }
  const root = payload as Record<string, unknown>;

  // Legacy wrappers — prefer nested catalog if present, else ignore empty wrappers
  const nested =
    root.filters &&
    typeof root.filters === "object" &&
    !Array.isArray(root.filters)
      ? (root.filters as Record<string, unknown>)
      : root.returnedFilters &&
          typeof root.returnedFilters === "object" &&
          !Array.isArray(root.returnedFilters)
        ? (root.returnedFilters as Record<string, unknown>)
        : null;

  // Legacy array of FilterRow { PartitionKey, name }
  if (Array.isArray(root.filters) || Array.isArray(root.returnedFilters)) {
    const rows = (Array.isArray(root.filters)
      ? root.filters
      : root.returnedFilters) as unknown[];
    const catalog: FilterCatalog = {};
    for (const row of rows) {
      if (!row || typeof row !== "object") continue;
      const o = row as Record<string, unknown>;
      const level = String(o.PartitionKey ?? o.level ?? "").toLowerCase();
      const name = String(o.name ?? "").trim();
      if (!isFilterLevel(level) || !name) continue;
      const list = catalog[level] ?? [];
      if (!list.includes(name)) list.push(name);
      catalog[level] = list;
    }
    for (const level of FILTER_LEVELS) {
      if (catalog[level]) {
        catalog[level] = [...catalog[level]!].sort((a, b) =>
          a.localeCompare(b),
        );
      }
    }
    return catalog;
  }

  const source = nested ?? root;
  const catalog: FilterCatalog = {};
  for (const [key, value] of Object.entries(source)) {
    if (!isFilterLevel(key)) continue;
    if (!Array.isArray(value)) continue;
    const names = [
      ...new Set(
        value
          .map((v) => (typeof v === "string" ? v.trim() : String(v ?? "").trim()))
          .filter(Boolean),
      ),
    ].sort((a, b) => a.localeCompare(b));
    catalog[key] = names;
  }
  return catalog;
}

function namesAtLevel(catalog: FilterCatalog, level: FilterLevel): string[] {
  return catalog[level] ?? [];
}

/**
 * Options for a level from the flat catalog.
 * Without filterbundles, show the full list for each level (still useful);
 * when parents are selected and we have no bundles, keep showing the full
 * child-level list (server AND-filters across levels on apply).
 */
export function optionsForLevel(
  catalog: FilterCatalog,
  level: FilterLevel,
  _selected: SelectedFilters,
): string[] {
  void _selected;
  return namesAtLevel(catalog, level);
}

/** Toggle a value; prune descendants that are no longer in the catalog. */
export function toggleFilterValue(
  selected: SelectedFilters,
  level: FilterLevel,
  value: string,
  catalog: FilterCatalog,
): SelectedFilters {
  const current = selected[level] ?? [];
  const nextValues = current.includes(value)
    ? current.filter((v) => v !== value)
    : [...current, value];

  const next: SelectedFilters = { ...selected };
  if (nextValues.length === 0) delete next[level];
  else next[level] = nextValues;

  return pruneInvalidDescendants(next, level, catalog);
}

export function pruneInvalidDescendants(
  selected: SelectedFilters,
  changedLevel: FilterLevel,
  catalog: FilterCatalog,
): SelectedFilters {
  const start = FILTER_LEVELS.indexOf(changedLevel);
  const next: SelectedFilters = { ...selected };
  for (let i = start + 1; i < FILTER_LEVELS.length; i += 1) {
    const level = FILTER_LEVELS[i];
    const allowed = new Set(namesAtLevel(catalog, level));
    const cur = next[level];
    if (!cur?.length) continue;
    const kept = cur.filter((v) => allowed.has(v));
    if (kept.length === 0) delete next[level];
    else next[level] = kept;
  }
  return next;
}

export function hasLocationSelection(selected: SelectedFilters): boolean {
  return FILTER_LEVELS.some((l) => (selected[l]?.length ?? 0) > 0);
}

export function toCommaParam(values: string[] | undefined): string | undefined {
  if (!values?.length) return undefined;
  return values.join(",");
}

/** Flatten all filter value names for global navbar search. */
export function allFilterValues(catalog: FilterCatalog): string[] {
  const names = new Set<string>();
  for (const level of FILTER_LEVELS) {
    for (const n of catalog[level] ?? []) names.add(n);
  }
  return [...names].sort((a, b) => a.localeCompare(b));
}

export function matchFilterValues(values: string[], query: string): string[] {
  const tokens = query
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean);
  if (tokens.length === 0) return [];
  return values.filter((v) => {
    const lower = v.toLowerCase();
    return tokens.every((t) => lower.includes(t));
  });
}

export function catalogHasOptions(catalog: FilterCatalog): boolean {
  return FILTER_LEVELS.some((l) => (catalog[l]?.length ?? 0) > 0);
}
