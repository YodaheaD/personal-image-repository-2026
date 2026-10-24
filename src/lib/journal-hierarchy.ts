/**
 * Parse journal returnList (Functions PR #5):
 * [{ tripNumber, tripName, data: [{ foldername, data: [entryNames] }] }]
 */

export interface JournalFolderNode {
  foldername: string;
  entries: string[];
}

export interface JournalTripNode {
  tripNumber: number;
  tripName: string;
  folders: JournalFolderNode[];
}

export interface JournalHierarchy {
  trips: JournalTripNode[];
}

function asString(v: unknown): string | undefined {
  if (v == null) return undefined;
  if (typeof v === "string" && v.trim()) return v.trim();
  if (typeof v === "number" && Number.isFinite(v)) return String(v);
  return undefined;
}

function asNumber(v: unknown): number | undefined {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim() && !Number.isNaN(Number(v))) {
    return Number(v);
  }
  return undefined;
}

function entryNames(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return [
    ...new Set(
      value
        .map((item) => {
          if (typeof item === "string") return item.trim();
          if (item && typeof item === "object") {
            return asString((item as Record<string, unknown>).name);
          }
          return undefined;
        })
        .filter((s): s is string => Boolean(s)),
    ),
  ];
}

function foldersFromTripData(data: unknown): JournalFolderNode[] {
  if (!Array.isArray(data)) return [];
  return data
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const o = item as Record<string, unknown>;
      const foldername =
        asString(o.foldername) ??
        asString(o.folderName) ??
        asString(o.folder);
      if (!foldername) return null;
      return {
        foldername,
        entries: entryNames(o.data ?? o.names ?? o.entries),
      };
    })
    .filter((f): f is JournalFolderNode => Boolean(f));
}

/** Normalize returnList payload into trips ordered by tripNumber. */
export function parseJournalHierarchy(payload: unknown): JournalHierarchy {
  let list: unknown = payload;

  // Unwrap accidental envelopes: { data: [...] } or { trips: [...] }
  if (list && typeof list === "object" && !Array.isArray(list)) {
    const o = list as Record<string, unknown>;
    if (Array.isArray(o.data)) list = o.data;
    else if (Array.isArray(o.trips)) list = o.trips;
  }

  if (!Array.isArray(list)) return { trips: [] };

  const trips: JournalTripNode[] = [];
  for (const item of list) {
    if (!item || typeof item !== "object") continue;
    const o = item as Record<string, unknown>;
    const tripNumber = asNumber(o.tripNumber) ?? asNumber(o.trip_number) ?? 0;
    const tripName =
      asString(o.tripName) ??
      asString(o.trip_name) ??
      (tripNumber ? `Trip ${tripNumber}` : "Journal");
    const folders = foldersFromTripData(o.data);
    trips.push({ tripNumber, tripName, folders });
  }

  trips.sort((a, b) => a.tripNumber - b.tripNumber);
  return { trips };
}

export function countEntries(h: JournalHierarchy): number {
  return h.trips.reduce(
    (sum, t) =>
      sum + t.folders.reduce((s, f) => s + f.entries.length, 0),
    0,
  );
}

/** Parse returnText body: [text, images] | object | 204 → empty. */
export function parseReturnTextBody(data: unknown): {
  text: string;
  images: string[];
} {
  if (data == null || data === "") {
    return { text: "", images: [] };
  }

  if (Array.isArray(data)) {
    const text = data[0] == null ? "" : String(data[0]);
    const rawImages = data[1];
    let images: string[] = [];
    if (Array.isArray(rawImages)) {
      images = rawImages.map(String).filter(Boolean);
    } else if (typeof rawImages === "string" && rawImages.trim()) {
      try {
        const parsed = JSON.parse(rawImages) as unknown;
        images = Array.isArray(parsed)
          ? parsed.map(String)
          : [rawImages.trim()];
      } catch {
        images = rawImages
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean);
      }
    }
    return { text, images };
  }

  if (typeof data === "object") {
    const o = data as Record<string, unknown>;
    return {
      text: String(o.text ?? o.story ?? o.data ?? ""),
      images: Array.isArray(o.images) ? o.images.map(String) : [],
    };
  }

  return { text: String(data), images: [] };
}
