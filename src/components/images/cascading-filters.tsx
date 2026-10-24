"use client";

import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { FilterBundle, FilterLevel, FilterRow } from "@/lib/api/types";
import { FILTER_LEVELS } from "@/lib/api/types";
import {
  cascadeClear,
  optionsForLevel,
  type SelectedFilters,
} from "@/lib/filters";

const CLEAR = "__clear__";

interface Props {
  filters: FilterRow[];
  bundles?: FilterBundle[] | Record<string, string[]>;
  selected: SelectedFilters;
  onChange: (next: SelectedFilters) => void;
}

const LABELS: Record<FilterLevel, string> = {
  country: "Country",
  state: "State",
  country2: "Country 2",
  city: "City",
  area: "Area",
  neighborhood: "Neighborhood",
};

export function CascadingFilters({
  filters,
  bundles,
  selected,
  onChange,
}: Props) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {FILTER_LEVELS.map((level) => {
        const options = optionsForLevel(filters, bundles, level, selected);
        const disabled = options.length === 0 && level !== "country";
        const value = selected[level];

        return (
          <div key={level} className="space-y-1.5">
            <Label htmlFor={`filter-${level}`}>{LABELS[level]}</Label>
            <Select
              value={value ?? undefined}
              disabled={disabled}
              onValueChange={(v) => {
                if (v === CLEAR) {
                  onChange(cascadeClear(selected, level, undefined));
                } else {
                  onChange(cascadeClear(selected, level, v));
                }
              }}
            >
              <SelectTrigger id={`filter-${level}`}>
                <SelectValue
                  placeholder={disabled ? "—" : `Any ${LABELS[level].toLowerCase()}`}
                />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={CLEAR}>Any</SelectItem>
                {options.map((opt) => (
                  <SelectItem key={opt} value={opt}>
                    {opt}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        );
      })}
    </div>
  );
}
