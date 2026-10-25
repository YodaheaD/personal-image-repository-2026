import type { ImageRecord } from "@/lib/api/types";

const HEIC_RE = /\.heic(?:\?|#|$)/i;
const COMPRESSED_CONTAINER = "compressedimages";
const THUMBNAIL_CONTAINER = "thumbnailimages";

function isHeicUrl(url: string): boolean {
  return HEIC_RE.test(url);
}

/**
 * Accept compressedimages / thumbnailimages `.webp` (or other raster) URLs;
 * reject HEIC / originals.
 */
function isUsablePreviewUrl(raw: string): boolean {
  if (!raw.trim() || isHeicUrl(raw)) return false;
  if (
    raw.includes(`/${COMPRESSED_CONTAINER}/`) ||
    raw.includes(`/${THUMBNAIL_CONTAINER}/`)
  ) {
    return true;
  }
  if (/\.webp(?:\?|#|$)/i.test(raw)) return true;
  return /\.(jpe?g|png|gif|avif)(?:\?|#|$)/i.test(raw);
}

function firstUsable(
  ...candidates: Array<string | undefined | null>
): string | null {
  for (const raw of candidates) {
    if (typeof raw !== "string") continue;
    if (!isUsablePreviewUrl(raw)) continue;
    return raw;
  }
  return null;
}

/** Small grid cell — prefer `thumbnailUrl` (thumbnailimages), else compressed. */
export function resolveGridImageUrl(img: ImageRecord): string | null {
  return firstUsable(img.thumbnailUrl, img.compressedUrl);
}

/**
 * Lightbox / popover detail — prefer fuller-quality `compressedUrl`.
 * Falls back to thumbnail only if compressed is missing.
 */
export function resolveDetailImageUrl(img: ImageRecord): string | null {
  return firstUsable(img.compressedUrl, img.thumbnailUrl);
}

/**
 * @deprecated Prefer resolveGridImageUrl / resolveDetailImageUrl.
 * Kept for callers that need any usable preview (thumb then compressed).
 */
export function resolveCompressedImageUrl(img: ImageRecord): string | null {
  return resolveGridImageUrl(img);
}

/** Drop records with no usable thumb/compressed preview (never show HEIC). */
export function filterDisplayableImages(images: ImageRecord[]): {
  displayable: ImageRecord[];
  hiddenHeicOrMissing: number;
} {
  const displayable: ImageRecord[] = [];
  let hiddenHeicOrMissing = 0;
  for (const img of images) {
    const url = resolveGridImageUrl(img) ?? resolveDetailImageUrl(img);
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
  return resolveGridImageUrl(img) ?? undefined;
}

/**
 * Basename for ensureThumbnails — prefer path of compressed/thumbnail URL,
 * else name / RowKey normalized to `.webp`.
 */
export function blobBasenameOf(img: ImageRecord): string | null {
  for (const raw of [img.compressedUrl, img.thumbnailUrl, img._displayUrl]) {
    if (typeof raw !== "string" || !raw.trim()) continue;
    try {
      const path = new URL(raw).pathname;
      const base = decodeURIComponent(path.split("/").pop() || "").replace(
        /\?.*$/,
        "",
      );
      if (base && !HEIC_RE.test(base)) return base;
      if (base) return base.replace(/\.heic$/i, ".webp");
    } catch {
      /* fall through */
    }
  }

  const raw = String(img.name || img.RowKey || "").trim();
  if (!raw) return null;
  if (HEIC_RE.test(raw)) return raw.replace(/\.heic$/i, ".webp");
  if (/\.(jpe?g|png|gif|avif)$/i.test(raw)) {
    return raw.replace(/\.(jpe?g|png|gif|avif)$/i, ".webp");
  }
  if (!/\.webp$/i.test(raw)) return `${raw}.webp`;
  return raw;
}

/**
 * Human label for gallery/alt — never surface `.heic` filenames.
 * Prefer basename of the compressed/thumbnail display URL (.webp).
 */
export function displayImageLabel(img: ImageRecord): string {
  const fromBlob = blobBasenameOf(img);
  if (fromBlob) return fromBlob;
  return "Image";
}
