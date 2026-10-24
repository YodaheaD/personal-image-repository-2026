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
  hasLocationSelection,
  optionsForLevel,
  toggleFilterValue,
  type FilterCatalog,
  type SelectedFilters,
} from "@/lib/filters";

interface Props {
  catalog: FilterCatalog;
  selected: SelectedFilters;
  onSelectedChange: (next: SelectedFilters) => void;
  onDateSearch: (range: DateRangeResult) => void;
  onReset: () => void;
  disabled?: boolean;
  hasDateRange: boolean;
}

export function FilterSidebar({
  catalog,
  selected,
  onSelectedChange,
  onDateSearch,
  onReset,
  disabled,
  hasDateRange,
}: Props) {
  const { isOpen, toggle } = useOpenSet(["country", "dateTaken"]);

  function onToggleValue(level: FilterLevel, value: string) {
    onSelectedChange(toggleFilterValue(selected, level, value, catalog));
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
        <p className="border-b border-[var(--border)] px-3 py-2 text-xs text-[var(--muted-foreground)]">
          Location and dateTaken are mutually exclusive — applying one clears
          the other.
        </p>
      )}

      <div className="min-h-0 flex-1 overflow-y-auto">
        <Accordion>
          {FILTER_ACCORDION_ORDER.map((level) => {
            const options = optionsForLevel(catalog, level, selected);
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
                    No options
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
                            <span className="break-words leading-snug">{opt}</span>
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
            id="dateTaken"
            title="Date taken"
            badge={hasDateRange ? 1 : 0}
            open={isOpen("dateTaken")}
            onToggle={() => toggle("dateTaken")}
          >
            <DateRangeSearch disabled={disabled} onSearch={onDateSearch} compact />
          </AccordionItem>
        </Accordion>
      </div>
    </div>
  );
}
