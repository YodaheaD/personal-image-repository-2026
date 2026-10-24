import type { FilterBundle, FilterLevel, FilterRow } from "@/lib/api/types";
import { FILTER_LEVELS } from "@/lib/api/types";

/** Multi-select location filters. */
export type SelectedFilters = Partial<Record<FilterLevel, string[]>>;

function levelOf(row: FilterRow): string {
  return String(row.PartitionKey ?? row.level ?? "").toLowerCase();
}

function childrenOf(
  bundles: FilterBundle[] | Record<string, string[]> | undefined,
  parentName: string,
): string[] {
  if (!bundles) return [];
  if (Array.isArray(bundles)) {
    const hit = bundles.find(
      (b) =>
        b.name === parentName ||
        b.RowKey === parentName ||
        b.PartitionKey === parentName,
    );
    return hit?.children ?? [];
  }
  return bundles[parentName] ?? [];
}

function allNamesAtLevel(filters: FilterRow[], level: FilterLevel): string[] {
  const names = filters
    .filter((f) => levelOf(f) === level)
    .map((f) => f.name)
    .filter(Boolean);
  return [...new Set(names)].sort((a, b) => a.localeCompare(b));
}

/**
 * Options for a level.
 * - Country (root): always all values.
 * - Deeper levels: if any immediate parents selected → union of their children
 *   (filterbundles); else all values at that level.
 */
export function optionsForLevel(
  filters: FilterRow[],
  bundles: FilterBundle[] | Record<string, string[]> | undefined,
  level: FilterLevel,
  selected: SelectedFilters,
): string[] {
  const levelIndex = FILTER_LEVELS.indexOf(level);
  if (levelIndex < 0) return [];

  if (levelIndex === 0) {
    return allNamesAtLevel(filters, level);
  }

  const parentLevel = FILTER_LEVELS[levelIndex - 1];
  const parents = selected[parentLevel] ?? [];

  if (parents.length === 0) {
    return allNamesAtLevel(filters, level);
  }

  const fromBundles = new Set<string>();
  let anyBundleHit = false;
  for (const parent of parents) {
    const kids = childrenOf(bundles, parent);
    if (kids.length > 0) {
      anyBundleHit = true;
      for (const k of kids) fromBundles.add(k);
    }
  }
  if (anyBundleHit) {
    return [...fromBundles].sort((a, b) => a.localeCompare(b));
  }

  const fromRows = filters
    .filter(
      (f) =>
        levelOf(f) === level &&
        (!f.parentName || parents.includes(String(f.parentName))),
    )
    .map((f) => f.name)
    .filter(Boolean);
  return [...new Set(fromRows)].sort((a, b) => a.localeCompare(b));
}

/** Toggle a value; prune invalid descendants when selection shrinks. */
export function toggleFilterValue(
  selected: SelectedFilters,
  level: FilterLevel,
  value: string,
  filters: FilterRow[],
  bundles: FilterBundle[] | Record<string, string[]> | undefined,
): SelectedFilters {
  const current = selected[level] ?? [];
  const nextValues = current.includes(value)
    ? current.filter((v) => v !== value)
    : [...current, value];

  const next: SelectedFilters = { ...selected };
  if (nextValues.length === 0) delete next[level];
  else next[level] = nextValues;

  return pruneInvalidDescendants(next, level, filters, bundles);
}

/** After a level changes, drop child selections that are no longer options. */
export function pruneInvalidDescendants(
  selected: SelectedFilters,
  changedLevel: FilterLevel,
  filters: FilterRow[],
  bundles: FilterBundle[] | Record<string, string[]> | undefined,
): SelectedFilters {
  const start = FILTER_LEVELS.indexOf(changedLevel);
  const next: SelectedFilters = { ...selected };
  for (let i = start + 1; i < FILTER_LEVELS.length; i += 1) {
    const level = FILTER_LEVELS[i];
    const allowed = new Set(optionsForLevel(filters, bundles, level, next));
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

/** Flatten all filter value names for global navbar search (not image names). */
export function allFilterValues(filters: FilterRow[]): string[] {
  return [...new Set(filters.map((f) => f.name).filter(Boolean))].sort((a, b) =>
    a.localeCompare(b),
  );
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
