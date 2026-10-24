"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  dayOptions,
  MIN_YEAR,
  partsToEpochMs,
  yearOptions,
  type DateParts,
} from "@/lib/dates";
import { cn } from "@/lib/utils";

export interface DateRangeResult {
  startDate?: number;
  endDate?: number;
}

interface Props {
  onSearch: (range: DateRangeResult) => void;
  disabled?: boolean;
  compact?: boolean;
}

const empty: DateParts = { day: 0, month: 0, year: 0 };

function PartSelects({
  label,
  value,
  onChange,
  compact,
}: {
  label: string;
  value: DateParts;
  onChange: (next: DateParts) => void;
  compact?: boolean;
}) {
  const years = useMemo(() => yearOptions(), []);
  const days = useMemo(
    () => dayOptions(value.month || 1, value.year || MIN_YEAR),
    [value.month, value.year],
  );

  return (
    <div className="space-y-1.5">
      <Label className="text-xs">{label}</Label>
      <div className={cn("flex flex-wrap gap-1.5", compact && "gap-1")}>
        <Select
          value={value.day ? String(value.day) : undefined}
          onValueChange={(v) => onChange({ ...value, day: Number(v) })}
        >
          <SelectTrigger className="w-[4.25rem]" aria-label={`${label} day`}>
            <SelectValue placeholder="DD" />
          </SelectTrigger>
          <SelectContent>
            {days.map((d) => (
              <SelectItem key={d} value={String(d)}>
                {String(d).padStart(2, "0")}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={value.month ? String(value.month) : undefined}
          onValueChange={(v) => onChange({ ...value, month: Number(v) })}
        >
          <SelectTrigger className="w-[4.25rem]" aria-label={`${label} month`}>
            <SelectValue placeholder="MM" />
          </SelectTrigger>
          <SelectContent>
            {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
              <SelectItem key={m} value={String(m)}>
                {String(m).padStart(2, "0")}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={value.year ? String(value.year) : undefined}
          onValueChange={(v) => onChange({ ...value, year: Number(v) })}
        >
          <SelectTrigger className="w-[5.25rem]" aria-label={`${label} year`}>
            <SelectValue placeholder="YYYY" />
          </SelectTrigger>
          <SelectContent>
            {years.map((y) => (
              <SelectItem key={y} value={String(y)}>
                {y}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}

export function DateRangeSearch({ onSearch, disabled, compact }: Props) {
  const [start, setStart] = useState<DateParts>(empty);
  const [stop, setStop] = useState<DateParts>(empty);
  const [error, setError] = useState<string | null>(null);

  function handleSearch() {
    setError(null);
    const hasStart = start.day || start.month || start.year;
    const hasStop = stop.day || stop.month || stop.year;

    let startDate: number | undefined;
    let endDate: number | undefined;

    if (hasStart) {
      const ms = partsToEpochMs(start, "start");
      if (ms == null) {
        setError("Start date incomplete or invalid (year ≥ 2000).");
        return;
      }
      startDate = ms;
    }
    if (hasStop) {
      const ms = partsToEpochMs(stop, "end");
      if (ms == null) {
        setError("Stop date incomplete or invalid (year ≥ 2000).");
        return;
      }
      endDate = ms;
    }
    if (startDate != null && endDate != null && startDate > endDate) {
      setError("Start must be on or before Stop.");
      return;
    }

    onSearch({ startDate, endDate });
  }

  function clear() {
    setStart(empty);
    setStop(empty);
    setError(null);
    onSearch({});
  }

  return (
    <div className={cn("space-y-3", !compact && "rounded-md border border-[var(--border)] p-3")}>
      {!compact && (
        <p className="text-sm font-medium text-[var(--foreground)]">Date taken</p>
      )}
      <div className="grid gap-3">
        <PartSelects label="Start" value={start} onChange={setStart} compact={compact} />
        <PartSelects label="Stop" value={stop} onChange={setStop} compact={compact} />
      </div>
      {error && <p className="text-xs text-red-600 dark:text-red-400">{error}</p>}
      <div className="flex flex-wrap gap-2">
        <Button type="button" size="sm" onClick={handleSearch} disabled={disabled}>
          Search
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={clear}
          disabled={disabled}
        >
          Clear
        </Button>
      </div>
      <p className="text-xs text-[var(--muted-foreground)]">
        Date range sent only on Search (`startDate` / `endDate` epoch ms UTC).
      </p>
    </div>
  );
}
