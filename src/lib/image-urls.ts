import type { ImageRecord } from "@/lib/api/types";

const HEIC_RE = /\.heic(?:\?|#|$)/i;
const COMPRESSED_CONTAINER = "compressedimages";

function isHeicUrl(url: string): boolean {
  return HEIC_RE.test(url);
}

/**
 * Gallery/preview URL — use `thumbnailUrl` or `compressedUrl` only
 * (compressedimages `.webp`, ideally with SAS). Never HEIC / originals.
 */
export function resolveCompressedImageUrl(img: ImageRecord): string | null {
  const candidates = [img.thumbnailUrl, img.compressedUrl];
  for (const raw of candidates) {
    if (typeof raw !== "string" || !raw.trim()) continue;
    if (isHeicUrl(raw)) continue;
    if (
      !raw.includes(`/${COMPRESSED_CONTAINER}/`) &&
      !/\.webp(?:\?|#|$)/i.test(raw)
    ) {
      if (!/\.(jpe?g|png|webp|gif|avif)(?:\?|#|$)/i.test(raw)) continue;
    }
    return raw;
  }
  return null;
}

/** Drop records with no usable compressed preview (never show HEIC). */
export function filterDisplayableImages(images: ImageRecord[]): {
  displayable: ImageRecord[];
  hiddenHeicOrMissing: number;
} {
  const displayable: ImageRecord[] = [];
  let hiddenHeicOrMissing = 0;
  for (const img of images) {
    const url = resolveCompressedImageUrl(img);
    if (!url) {
      hiddenHeicOrMissing += 1;
      continue;
    }
    displayable.push({ ...img, _displayUrl: url });
  }
  return { displayable, hiddenHeicOrMissing };
}

export function displayUrlOf(img: ImageRecord): string | undefined {
  const tagged = img._displayUrl;
  if (typeof tagged === "string" && tagged.length > 0) return tagged;
  return resolveCompressedImageUrl(img) ?? undefined;
}

/**
 * Human label for gallery/alt — never surface `.heic` filenames.
 * Prefer basename of the compressed display URL (.webp), else strip HEIC
 * from name fields.
 */
export function displayImageLabel(img: ImageRecord): string {
  const url = displayUrlOf(img);
  if (url) {
    try {
      const path = new URL(url).pathname;
      const base = decodeURIComponent(path.split("/").pop() || "");
      if (base && !HEIC_RE.test(base)) {
        return base.replace(/\?.*$/, "");
      }
      if (base) {
        return base.replace(/\.heic$/i, ".webp");
      }
    } catch {
      /* fall through */
    }
  }

  const raw = String(img.name || img.RowKey || "").trim();
  if (!raw) return "Image";
  if (HEIC_RE.test(raw)) {
    return raw.replace(/\.heic$/i, ".webp");
  }
  return raw;
}
