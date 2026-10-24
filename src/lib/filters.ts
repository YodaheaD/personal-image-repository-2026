import type { FilterLevel } from "@/lib/api/types";
import { FILTER_LEVELS } from "@/lib/api/types";

/** Multi-select location filters. */
export type SelectedFilters = Partial<Record<FilterLevel, string[]>>;

/**
 * Flat getFilters catalog — `{ country: string[], state: string[], ... }`.
 */
export type FilterCatalog = Partial<Record<FilterLevel, string[]>>;

/** parentName → immediate children (from filterbundles / getFilters.bundles). */
export type FilterBundles = Record<string, string[]>;

function isFilterLevel(key: string): key is FilterLevel {
  return (FILTER_LEVELS as readonly string[]).includes(key);
}

function asStringList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return [
    ...new Set(
      value
        .map((v) =>
          typeof v === "string" ? v.trim() : String(v ?? "").trim(),
        )
        .filter(Boolean),
    ),
  ].sort((a, b) => a.localeCompare(b));
}

/** Normalize level → string[] maps (getFilters / cascadeFilters / returnedFilters). */
export function parseFilterCatalog(payload: unknown): FilterCatalog {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return {};
  }
  const root = payload as Record<string, unknown>;

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
    catalog[key] = asStringList(value);
  }
  return catalog;
}

/**
 * Parse parent → children maps from getFilters (or cascade) payloads.
 * Accepts:
 * - bundles / filterbundles as Record<parentName, string[]>
 * - bundles / filterbundles as array of { name|RowKey, children }
 * - bundles nested by level: { country: { Spain: [...] }, state: { ... } }
 */
export function parseFilterBundles(payload: unknown): FilterBundles {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return {};
  }
  const root = payload as Record<string, unknown>;
  const raw = root.bundles ?? root.filterbundles ?? root.filterBundles;
  if (!raw) return {};

  const out: FilterBundles = {};

  function add(parent: string, children: string[]) {
    if (!parent || children.length === 0) return;
    const existing = out[parent] ?? [];
    out[parent] = [...new Set([...existing, ...children])].sort((a, b) =>
      a.localeCompare(b),
    );
  }

  if (Array.isArray(raw)) {
    for (const item of raw) {
      if (!item || typeof item !== "object") continue;
      const o = item as Record<string, unknown>;
      const parent = String(
        o.name ?? o.RowKey ?? o.parentName ?? o.parent ?? "",
      ).trim();
      add(parent, asStringList(o.children ?? o.childNames ?? o.data));
    }
    return out;
  }

  if (typeof raw === "object") {
    for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
      // Nested by level: { country: { Spain: [...] } }
      if (
        value &&
        typeof value === "object" &&
        !Array.isArray(value) &&
        isFilterLevel(key)
      ) {
        for (const [parent, kids] of Object.entries(
          value as Record<string, unknown>,
        )) {
          add(parent, asStringList(kids));
        }
        continue;
      }
      add(key, asStringList(value));
    }
  }

  return out;
}

/** All descendant names reachable from roots via immediate-child bundles. */
export function collectDescendants(
  bundles: FilterBundles,
  roots: string[],
): Set<string> {
  const found = new Set<string>();
  const queue = [...roots];
  const seen = new Set<string>();
  while (queue.length > 0) {
    const node = queue.shift()!;
    if (seen.has(node)) continue;
    seen.add(node);
    const kids = bundles[node] ?? [];
    for (const child of kids) {
      found.add(child);
      queue.push(child);
    }
  }
  return found;
}

function selectedAncestorValues(
  selected: SelectedFilters,
  level: FilterLevel,
): string[] {
  const idx = FILTER_LEVELS.indexOf(level);
  const values: string[] = [];
  for (let i = 0; i < idx; i += 1) {
    const part = selected[FILTER_LEVELS[i]];
    if (part?.length) values.push(...part);
  }
  return values;
}

/**
 * Options for a level.
 * - country: always full catalog
 * - lower levels with selected ancestor(s):
 *   prefer `cascadeAllowed` (from cascadeFilters API), else intersect catalog
 *   with recursive descendants from bundles; if neither, empty (not full list)
 * - lower levels with no selected ancestor: full catalog for that level
 */
export function optionsForLevel(
  catalog: FilterCatalog,
  level: FilterLevel,
  selected: SelectedFilters,
  opts?: {
    bundles?: FilterBundles;
    /** From GET cascadeFilters — allowed names per level */
    cascadeAllowed?: FilterCatalog;
  },
): string[] {
  const full = catalog[level] ?? [];
  if (level === "country") return full;

  const ancestors = selectedAncestorValues(selected, level);
  // No selected ancestor → full catalog for this level (Functions PR #7 rules).
  if (ancestors.length === 0) return full;

  const cascade = opts?.cascadeAllowed;
  if (cascade && Object.keys(cascade).length > 0) {
    const fromApi = cascade[level] ?? [];
    const allow = new Set(fromApi);
    const filtered = full.filter((n) => allow.has(n));
    return filtered.length > 0
      ? filtered
      : [...fromApi].sort((a, b) => a.localeCompare(b));
  }

  const bundles = opts?.bundles;
  if (bundles && Object.keys(bundles).length > 0) {
    const desc = collectDescendants(bundles, ancestors);
    return full.filter((n) => desc.has(n));
  }

  // Ancestors selected but cascade/bundles not loaded yet
  return [];
}

/** Shallow equality for selected filter maps (avoid cascade effect loops). */
export function selectionsEqual(
  a: SelectedFilters,
  b: SelectedFilters,
): boolean {
  for (const level of FILTER_LEVELS) {
    const av = a[level] ?? [];
    const bv = b[level] ?? [];
    if (av.length !== bv.length) return false;
    for (let i = 0; i < av.length; i += 1) {
      if (av[i] !== bv[i]) return false;
    }
  }
  return true;
}

export function toggleFilterValue(
  selected: SelectedFilters,
  level: FilterLevel,
  value: string,
  catalog: FilterCatalog,
  opts?: { bundles?: FilterBundles; cascadeAllowed?: FilterCatalog },
): SelectedFilters {
  const current = selected[level] ?? [];
  const nextValues = current.includes(value)
    ? current.filter((v) => v !== value)
    : [...current, value];

  const next: SelectedFilters = { ...selected };
  if (nextValues.length === 0) delete next[level];
  else next[level] = nextValues;

  return pruneInvalidDescendants(next, level, catalog, opts);
}

export function pruneInvalidDescendants(
  selected: SelectedFilters,
  changedLevel: FilterLevel,
  catalog: FilterCatalog,
  opts?: { bundles?: FilterBundles; cascadeAllowed?: FilterCatalog },
): SelectedFilters {
  const start = FILTER_LEVELS.indexOf(changedLevel);
  const next: SelectedFilters = { ...selected };
  for (let i = start + 1; i < FILTER_LEVELS.length; i += 1) {
    const level = FILTER_LEVELS[i];
    const allowed = new Set(optionsForLevel(catalog, level, next, opts));
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

export function hasAncestorSelection(
  selected: SelectedFilters,
  level: FilterLevel,
): boolean {
  return selectedAncestorValues(selected, level).length > 0;
}

export function toCommaParam(values: string[] | undefined): string | undefined {
  if (!values?.length) return undefined;
  return values.join(",");
}

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
