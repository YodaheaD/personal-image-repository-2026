"use client";

import { DateRangeSearch, type DateRangeResult } from "@/components/images/date-range-search";
import { Accordion, AccordionItem, useOpenSet } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import type { FilterLevel } from "@/lib/api/types";
import {
  FILTER_ACCORDION_ORDER,
  FILTER_LEVEL_LABELS,
} from "@/lib/api/types";
import {
  hasAncestorSelection,
  hasLocationSelection,
  optionsForLevel,
  toggleFilterValue,
  type FilterBundles,
  type FilterCatalog,
  type SelectedFilters,
} from "@/lib/filters";
import keywords from "@/lib/keywords.json";

const TAG_OPTIONS: readonly string[] = keywords;

interface Props {
  catalog: FilterCatalog;
  bundles?: FilterBundles;
  cascadeAllowed?: FilterCatalog;
  selected: SelectedFilters;
  onSelectedChange: (next: SelectedFilters) => void;
  selectedTags: string[];
  onTagsChange: (next: string[]) => void;
  onDateSearch: (range: DateRangeResult) => void;
  onReset: () => void;
  disabled?: boolean;
  hasDateRange: boolean;
}

function toggleTag(selected: string[], value: string): string[] {
  return selected.includes(value)
    ? selected.filter((t) => t !== value)
    : [...selected, value];
}

export function FilterSidebar({
  catalog,
  bundles,
  cascadeAllowed,
  selected,
  onSelectedChange,
  selectedTags,
  onTagsChange,
  onDateSearch,
  onReset,
  disabled,
  hasDateRange,
}: Props) {
  const { isOpen, toggle } = useOpenSet(["country", "dateTaken"]);
  const cascadeOpts = { bundles, cascadeAllowed };

  function onToggleValue(level: FilterLevel, value: string) {
    onSelectedChange(
      toggleFilterValue(selected, level, value, catalog, cascadeOpts),
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden">
      <div className="flex shrink-0 items-center justify-between gap-2 border-b border-[var(--border)] px-3 py-2">
        <p className="text-sm font-semibold">Filters</p>
        <Button type="button" variant="ghost" size="sm" onClick={onReset}>
          Reset
        </Button>
      </div>

      {(hasLocationSelection(selected) || hasDateRange) && (
        <p className="shrink-0 border-b border-[var(--border)] px-3 py-2 text-xs text-[var(--muted-foreground)]">
          Location and dateTaken are mutually exclusive — applying one clears
          the other. Tags combine with either. Lower filter levels follow
          selected parents.
        </p>
      )}

      <div className="min-h-0 flex-1 overflow-y-auto">
        <Accordion>
          {FILTER_ACCORDION_ORDER.map((level) => {
            const options = optionsForLevel(
              catalog,
              level,
              selected,
              cascadeOpts,
            );
            const checked = selected[level] ?? [];
            return (
              <AccordionItem
                key={level}
                id={level}
                title={FILTER_LEVEL_LABELS[level]}
                badge={checked.length}
                open={isOpen(level)}
                onToggle={() => toggle(level)}
              >
                {options.length === 0 ? (
                  <p className="text-xs text-[var(--muted-foreground)]">
                    {level !== "country" && hasAncestorSelection(selected, level)
                      ? "No matching options under selection"
                      : "No options"}
                  </p>
                ) : (
                  <ul className="max-h-48 space-y-1 overflow-y-auto">
                    {options.map((opt) => {
                      const id = `${level}-${opt}`;
                      const isChecked = checked.includes(opt);
                      return (
                        <li key={opt}>
                          <label
                            htmlFor={id}
                            className="flex cursor-pointer items-start gap-2 text-sm"
                          >
                            <input
                              id={id}
                              type="checkbox"
                              className="mt-0.5 h-4 w-4 shrink-0 accent-[var(--primary)]"
                              checked={isChecked}
                              disabled={disabled}
                              onChange={() => onToggleValue(level, opt)}
                            />
                            <span className="break-words leading-snug">
                              {opt}
                            </span>
                          </label>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </AccordionItem>
            );
          })}

          <AccordionItem
            id="tags"
            title="Tags"
            badge={selectedTags.length}
            open={isOpen("tags")}
            onToggle={() => toggle("tags")}
          >
            {TAG_OPTIONS.length === 0 ? (
              <p className="text-xs text-[var(--muted-foreground)]">
                No options
              </p>
            ) : (
              <ul className="max-h-48 space-y-1 overflow-y-auto">
                {TAG_OPTIONS.map((opt) => {
                  const id = `tag-${opt}`;
                  const isChecked = selectedTags.includes(opt);
                  return (
                    <li key={opt}>
                      <label
                        htmlFor={id}
                        className="flex cursor-pointer items-start gap-2 text-sm"
                      >
                        <input
                          id={id}
                          type="checkbox"
                          className="mt-0.5 h-4 w-4 shrink-0 accent-[var(--primary)]"
                          checked={isChecked}
                          disabled={disabled}
                          onChange={() =>
                            onTagsChange(toggleTag(selectedTags, opt))
                          }
                        />
                        <span className="break-words leading-snug">{opt}</span>
                      </label>
                    </li>
                  );
                })}
              </ul>
            )}
          </AccordionItem>

          <AccordionItem
            id="dateTaken"
            title="Date taken"
            badge={hasDateRange ? 1 : 0}
            open={isOpen("dateTaken")}
            onToggle={() => toggle("dateTaken")}
          >
            <DateRangeSearch
              disabled={disabled}
              onSearch={onDateSearch}
              compact
            />
          </AccordionItem>
        </Accordion>
      </div>
    </div>
  );
}
