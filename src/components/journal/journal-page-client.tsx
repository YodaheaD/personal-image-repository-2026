"use client";

import { useCallback, useEffect, useState } from "react";
import { Accordion, AccordionItem } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import {
  journalDeleteName,
  journalEditStory,
  journalReturnList,
  journalReturnText,
} from "@/lib/api/client";
import {
  countEntries,
  parseJournalHierarchy,
  type JournalHierarchy,
} from "@/lib/journal-hierarchy";
import { cn } from "@/lib/utils";

interface SelectedLeaf {
  tripName: string;
  tripNumber: number;
  foldername: string;
  name: string;
}

export function JournalPageClient() {
  const [hierarchy, setHierarchy] = useState<JournalHierarchy>({ trips: [] });
  const [openTrip, setOpenTrip] = useState<number | null>(null);
  const [openFolders, setOpenFolders] = useState<Set<string>>(() => new Set());
  const [selected, setSelected] = useState<SelectedLeaf | null>(null);
  const [text, setText] = useState("");
  const [images, setImages] = useState<string[]>([]);
  const [listLoading, setListLoading] = useState(false);
  const [entryLoading, setEntryLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);

  const refreshList = useCallback(async () => {
    setListLoading(true);
    setError(null);
    try {
      const res = await journalReturnList();
      const parsed = parseJournalHierarchy(res);
      setHierarchy(parsed);
      if (parsed.trips.length > 0 && openTrip == null) {
        setOpenTrip(parsed.trips[0].tripNumber);
      }
    } catch (err: unknown) {
      setHierarchy({ trips: [] });
      setError(err instanceof Error ? err.message : "Failed to load journal");
    } finally {
      setListLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only seed openTrip once
  }, []);

  useEffect(() => {
    void refreshList();
  }, [refreshList]);

  function toggleTrip(tripNumber: number) {
    setOpenTrip((cur) => (cur === tripNumber ? null : tripNumber));
  }

  function toggleFolder(key: string) {
    setOpenFolders((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  async function selectEntry(leaf: SelectedLeaf) {
    setSelected(leaf);
    setError(null);
    setStatus(null);
    setEntryLoading(true);
    try {
      const entry = await journalReturnText({
        foldername: leaf.foldername,
        name: leaf.name,
      });
      setText(entry.text);
      setImages(entry.images);
      if (entry.empty) setStatus("Empty entry.");
    } catch (err: unknown) {
      setText("");
      setImages([]);
      setError(err instanceof Error ? err.message : "Failed to load entry");
    } finally {
      setEntryLoading(false);
    }
  }

  async function saveStory() {
    if (!selected) return;
    setSaving(true);
    setError(null);
    setStatus(null);
    try {
      await journalEditStory({
        foldername: selected.foldername,
        name: selected.name,
        data: text,
      });
      setStatus("Saved.");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function removeEntry() {
    if (!selected) return;
    if (!window.confirm(`Delete journal entry “${selected.name}”?`)) return;
    setError(null);
    try {
      await journalDeleteName({
        name: selected.name,
        foldername: selected.foldername,
      });
      setSelected(null);
      setText("");
      setImages([]);
      await refreshList();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Delete failed");
    }
  }

  const entryCount = countEntries(hierarchy);

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden md:flex-row">
      {/* ~30% hierarchy sidebar */}
      <aside className="flex max-h-[40vh] w-full shrink-0 flex-col overflow-hidden border-b border-[var(--border)] md:max-h-none md:h-full md:w-[30%] md:min-w-[16rem] md:max-w-sm md:border-b-0 md:border-r">
        <div className="flex items-center justify-between gap-2 border-b border-[var(--border)] px-3 py-3">
          <div>
            <h1 className="text-lg font-semibold">Journal</h1>
            <p className="text-xs text-[var(--muted-foreground)]">
              {listLoading
                ? "Loading…"
                : `${hierarchy.trips.length} trip${hierarchy.trips.length === 1 ? "" : "s"} · ${entryCount} entries`}
            </p>
          </div>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={() => void refreshList()}
            disabled={listLoading}
          >
            Refresh
          </Button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto">
          {!listLoading && hierarchy.trips.length === 0 ? (
            <p className="px-3 py-4 text-sm text-[var(--muted-foreground)]">
              No trips found.
            </p>
          ) : (
            <Accordion>
              {hierarchy.trips.map((trip) => {
                const tripOpen = openTrip === trip.tripNumber;
                const tripEntryCount = trip.folders.reduce(
                  (s, f) => s + f.entries.length,
                  0,
                );
                return (
                  <AccordionItem
                    key={trip.tripNumber}
                    id={`trip-${trip.tripNumber}`}
                    title={trip.tripName}
                    badge={tripEntryCount}
                    open={tripOpen}
                    onToggle={() => toggleTrip(trip.tripNumber)}
                  >
                    {trip.folders.length === 0 ? (
                      <p className="text-xs text-[var(--muted-foreground)]">
                        No folders
                      </p>
                    ) : (
                      <div className="border border-[var(--border)]">
                        {trip.folders.map((folder) => {
                          const fKey = `${trip.tripNumber}:${folder.foldername}`;
                          const folderOpen = openFolders.has(fKey);
                          return (
                            <AccordionItem
                              key={fKey}
                              id={fKey}
                              title={folder.foldername}
                              badge={folder.entries.length}
                              open={folderOpen}
                              onToggle={() => toggleFolder(fKey)}
                            >
                              {folder.entries.length === 0 ? (
                                <p className="text-xs text-[var(--muted-foreground)]">
                                  No entries
                                </p>
                              ) : (
                                <ul className="space-y-1">
                                  {folder.entries.map((name) => {
                                    const active =
                                      selected?.tripNumber ===
                                        trip.tripNumber &&
                                      selected.foldername ===
                                        folder.foldername &&
                                      selected.name === name;
                                    return (
                                      <li key={name}>
                                        <button
                                          type="button"
                                          className={cn(
                                            "w-full rounded-md px-2 py-1.5 text-left text-sm",
                                            active
                                              ? "bg-[var(--muted)] font-medium text-[var(--secondary)] dark:text-[var(--primary)]"
                                              : "hover:bg-[var(--muted)]",
                                          )}
                                          onClick={() =>
                                            void selectEntry({
                                              tripName: trip.tripName,
                                              tripNumber: trip.tripNumber,
                                              foldername: folder.foldername,
                                              name,
                                            })
                                          }
                                        >
                                          {name}
                                        </button>
                                      </li>
                                    );
                                  })}
                                </ul>
                              )}
                            </AccordionItem>
                          );
                        })}
                      </div>
                    )}
                  </AccordionItem>
                );
              })}
            </Accordion>
          )}
        </div>
      </aside>

      {/* ~70% content */}
      <section className="flex min-h-0 min-w-0 flex-1 flex-col overflow-y-auto px-4 py-6 sm:px-6">
        {error && (
          <p className="mb-3 rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-800 dark:bg-red-950/40 dark:text-red-200">
            {error}
          </p>
        )}
        {status && (
          <p className="mb-2 text-sm text-[var(--muted-foreground)]">{status}</p>
        )}

        {!selected ? (
          <div className="flex flex-1 items-center justify-center">
            <p className="text-xl font-medium text-[var(--muted-foreground)] sm:text-2xl">
              Select Journal Entry
            </p>
          </div>
        ) : entryLoading ? (
          <p className="text-sm text-[var(--muted-foreground)]">Loading entry…</p>
        ) : (
          <div className="mx-auto w-full max-w-3xl space-y-4">
            <div className="flex flex-wrap items-start gap-2">
              <div className="min-w-0 flex-1">
                <p className="text-xs text-[var(--muted-foreground)]">
                  {selected.tripName} · {selected.foldername}
                </p>
                <h2 className="text-xl font-semibold">{selected.name}</h2>
              </div>
              <div className="flex gap-2">
                <Button
                  type="button"
                  size="sm"
                  onClick={() => void saveStory()}
                  disabled={saving}
                >
                  {saving ? "Saving…" : "Save"}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => void removeEntry()}
                >
                  Delete
                </Button>
              </div>
            </div>

            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={18}
              className="w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]"
              placeholder="Write notes…"
              aria-label="Journal entry text"
            />

            <div>
              <p className="mb-1 text-sm font-medium">Images</p>
              {images.length === 0 ? (
                <p className="text-sm text-[var(--muted-foreground)]">
                  No linked images.
                </p>
              ) : (
                <ul className="flex flex-wrap gap-2">
                  {images.map((img) => (
                    <li
                      key={img}
                      className="rounded border border-[var(--border)] px-2 py-1 text-xs"
                    >
                      {img}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
