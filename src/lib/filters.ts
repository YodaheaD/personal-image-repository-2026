import type { FilterBundle, FilterLevel, FilterRow } from "@/lib/api/types";
import { FILTER_LEVELS } from "@/lib/api/types";

export type SelectedFilters = Partial<Record<FilterLevel, string>>;

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

/** Values for a level, optionally constrained by parent selection + bundles. */
export function optionsForLevel(
  filters: FilterRow[],
  bundles: FilterBundle[] | Record<string, string[]> | undefined,
  level: FilterLevel,
  selected: SelectedFilters,
): string[] {
  const levelIndex = FILTER_LEVELS.indexOf(level);
  if (levelIndex < 0) return [];

  const parentLevel = levelIndex > 0 ? FILTER_LEVELS[levelIndex - 1] : null;
  const parentValue = parentLevel ? selected[parentLevel] : undefined;

  if (parentValue) {
    const fromBundle = childrenOf(bundles, parentValue);
    if (fromBundle.length > 0) {
      return [...fromBundle].sort((a, b) => a.localeCompare(b));
    }
    const fromRows = filters
      .filter(
        (f) =>
          levelOf(f) === level &&
          (f.parentName === parentValue ||
            f.parentLevel === parentLevel ||
            !f.parentName),
      )
      .map((f) => f.name)
      .filter(Boolean);
    return [...new Set(fromRows)].sort((a, b) => a.localeCompare(b));
  }

  // Root level or no parent selected: all names at this level.
  // Only show deeper levels when ancestors are chosen (cascading UX).
  if (levelIndex > 0 && !parentValue) return [];

  const names = filters
    .filter((f) => levelOf(f) === level)
    .map((f) => f.name)
    .filter(Boolean);
  return [...new Set(names)].sort((a, b) => a.localeCompare(b));
}

/** Clear dependent levels when an ancestor changes. */
export function cascadeClear(
  selected: SelectedFilters,
  changedLevel: FilterLevel,
  value: string | undefined,
): SelectedFilters {
  const idx = FILTER_LEVELS.indexOf(changedLevel);
  const next: SelectedFilters = { ...selected };
  if (value) next[changedLevel] = value;
  else delete next[changedLevel];
  for (let i = idx + 1; i < FILTER_LEVELS.length; i += 1) {
    delete next[FILTER_LEVELS[i]];
  }
  return next;
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
