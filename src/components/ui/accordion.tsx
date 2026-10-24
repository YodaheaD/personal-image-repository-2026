"use client";

import { useState, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface AccordionItemProps {
  id: string;
  title: string;
  badge?: number;
  open: boolean;
  onToggle: () => void;
  children: ReactNode;
}

export function AccordionItem({
  title,
  badge,
  open,
  onToggle,
  children,
}: AccordionItemProps) {
  return (
    <div className="border-b border-[var(--border)]">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm font-medium hover:bg-[var(--muted)]"
        aria-expanded={open}
      >
        <ChevronDown
          className={cn("h-4 w-4 shrink-0", open ? "rotate-0" : "-rotate-90")}
          aria-hidden
        />
        <span className="flex-1">{title}</span>
        {badge != null && badge > 0 && (
          <span className="rounded bg-[var(--muted)] px-1.5 py-0.5 text-xs tabular-nums text-[var(--muted-foreground)]">
            {badge}
          </span>
        )}
      </button>
      {open ? <div className="px-3 pb-3">{children}</div> : null}
    </div>
  );
}

interface AccordionProps {
  children: ReactNode;
  className?: string;
}

export function Accordion({ children, className }: AccordionProps) {
  return <div className={cn("border-y border-[var(--border)]", className)}>{children}</div>;
}

/** Controlled multi-open helper for accordion sets. */
export function useOpenSet(initial: string[] = []) {
  const [open, setOpen] = useState<Set<string>>(() => new Set(initial));
  function toggle(id: string) {
    setOpen((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }
  return { open, toggle, isOpen: (id: string) => open.has(id) };
}
