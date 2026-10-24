"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  journalAddName,
  journalDeleteName,
  journalEditStory,
  journalMakeFolder,
  journalReturnList,
  journalReturnText,
} from "@/lib/api/client";
import type { JournalEntry } from "@/lib/api/types";

function normalizeList(data: unknown): { folders: string[]; names: string[] } {
  if (!data || typeof data !== "object") return { folders: [], names: [] };
  const d = data as Record<string, unknown>;

  const folders = Array.isArray(d.folders)
    ? d.folders.map(String)
    : Array.isArray(d.Folders)
      ? (d.Folders as unknown[]).map(String)
      : [];

  let names: string[] = [];
  if (Array.isArray(d.names)) names = d.names.map(String);
  else if (Array.isArray(d.entries)) {
    names = (d.entries as JournalEntry[])
      .map((e) => e.name)
      .filter(Boolean)
      .map(String);
  } else if (Array.isArray(d.data)) {
    names = (d.data as JournalEntry[])
      .map((e) => (typeof e === "string" ? e : e.name))
      .filter(Boolean)
      .map(String);
  } else if (d.data && typeof d.data === "object" && !Array.isArray(d.data)) {
    names = Object.keys(d.data as object);
  }

  return { folders, names: [...new Set(names)] };
}

export function JournalPageClient() {
  const [folders, setFolders] = useState<string[]>([]);
  const [names, setNames] = useState<string[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [text, setText] = useState("");
  const [images, setImages] = useState<string[]>([]);
  const [newName, setNewName] = useState("");
  const [newFolder, setNewFolder] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);

  const refreshList = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await journalReturnList();
      const { folders: f, names: n } = normalizeList(res);
      setFolders(f);
      setNames(n);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load journal");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refreshList();
  }, [refreshList]);

  const loadEntry = useCallback(async (name: string) => {
    setSelected(name);
    setError(null);
    setStatus(null);
    try {
      const entry = await journalReturnText(name);
      setText(String(entry.text ?? entry.story ?? ""));
      setImages(
        Array.isArray(entry.images) ? entry.images.map(String) : [],
      );
    } catch (err: unknown) {
      setText("");
      setImages([]);
      setError(err instanceof Error ? err.message : "Failed to load entry");
    }
  }, []);

  const sortedNames = useMemo(
    () => [...names].sort((a, b) => a.localeCompare(b)),
    [names],
  );

  async function saveStory() {
    if (!selected) return;
    setSaving(true);
    setError(null);
    setStatus(null);
    try {
      await journalEditStory({ name: selected, text, story: text });
      setStatus("Saved.");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function addEntry() {
    const name = newName.trim();
    if (!name) return;
    setError(null);
    try {
      await journalAddName({
        name,
        folder: newFolder.trim() || undefined,
      });
      setNewName("");
      await refreshList();
      await loadEntry(name);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Add failed");
    }
  }

  async function removeEntry() {
    if (!selected) return;
    if (!window.confirm(`Delete journal entry “${selected}”?`)) return;
    setError(null);
    try {
      await journalDeleteName({ name: selected });
      setSelected(null);
      setText("");
      setImages([]);
      await refreshList();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Delete failed");
    }
  }

  async function createFolder() {
    const folder = newFolder.trim();
    if (!folder) return;
    setError(null);
    try {
      await journalMakeFolder({ folder });
      setStatus(`Folder “${folder}” created.`);
      await refreshList();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Make folder failed");
    }
  }

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-6 lg:flex-row">
      <aside className="w-full shrink-0 space-y-4 lg:w-64">
        <div>
          <h1 className="text-xl font-semibold">Journal</h1>
          <p className="mt-1 text-sm text-[var(--muted-foreground)]">
            Simple notebook tied to the Functions journal table.
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="new-entry">New entry</Label>
          <Input
            id="new-entry"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Entry name"
          />
          <Input
            value={newFolder}
            onChange={(e) => setNewFolder(e.target.value)}
            placeholder="Folder (optional)"
          />
          <div className="flex flex-wrap gap-2">
            <Button type="button" size="sm" onClick={() => void addEntry()}>
              Add
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => void createFolder()}
            >
              Make folder
            </Button>
          </div>
        </div>

        {folders.length > 0 && (
          <div>
            <p className="mb-1 text-xs font-medium uppercase tracking-wide text-[var(--muted-foreground)]">
              Folders
            </p>
            <ul className="space-y-0.5 text-sm">
              {folders.map((f) => (
                <li key={f} className="truncate px-1 py-0.5">
                  {f}
                </li>
              ))}
            </ul>
          </div>
        )}

        <div>
          <div className="mb-1 flex items-center justify-between">
            <p className="text-xs font-medium uppercase tracking-wide text-[var(--muted-foreground)]">
              Entries
            </p>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => void refreshList()}
              disabled={loading}
            >
              Refresh
            </Button>
          </div>
          {loading ? (
            <p className="text-sm text-[var(--muted-foreground)]">Loading…</p>
          ) : sortedNames.length === 0 ? (
            <p className="text-sm text-[var(--muted-foreground)]">No entries.</p>
          ) : (
            <ul className="max-h-[28rem] space-y-0.5 overflow-auto rounded-md border border-[var(--border)] p-1">
              {sortedNames.map((name) => (
                <li key={name}>
                  <button
                    type="button"
                    onClick={() => void loadEntry(name)}
                    className={`w-full rounded px-2 py-1.5 text-left text-sm ${
                      selected === name
                        ? "bg-[var(--muted)] font-medium"
                        : "hover:bg-[var(--muted)]"
                    }`}
                  >
                    {name}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </aside>

      <section className="min-w-0 flex-1 space-y-3">
        {error && (
          <p className="rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-800 dark:bg-red-950/40 dark:text-red-200">
            {error}
          </p>
        )}
        {status && (
          <p className="text-sm text-[var(--muted-foreground)]">{status}</p>
        )}

        {!selected ? (
          <p className="py-16 text-center text-sm text-[var(--muted-foreground)]">
            Select or create an entry.
          </p>
        ) : (
          <>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-lg font-medium">{selected}</h2>
              <div className="ml-auto flex gap-2">
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

            <Label htmlFor="story">Story</Label>
            <textarea
              id="story"
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={16}
              className="w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]"
              placeholder="Write notes…"
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
          </>
        )}
      </section>
    </div>
  );
}
