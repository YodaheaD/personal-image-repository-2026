import type { ImageRecord } from "@/lib/api/types";
import {
  buildCompressedUrl,
  buildThumbnailUrl,
} from "@/lib/Blob_Container_locations";

const HEIC_RE = /\.heic(?:\?|#|$)/i;

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
    raw.includes("/compressedimages/") ||
    raw.includes("/thumbnailimages/")
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

/** Prefer slim `blobName`; normalize legacy name/RowKey to `.webp`. */
export function blobNameOf(img: ImageRecord): string | null {
  const slim = typeof img.blobName === "string" ? img.blobName.trim() : "";
  if (slim && !HEIC_RE.test(slim)) return slim;
  if (slim) return slim.replace(/\.heic$/i, ".webp");
  return blobBasenameOf(img);
}

/**
 * Small grid cell — prefer thumbnailimages from blobName + sasToken,
 * else legacy thumbnailUrl / compressedUrl.
 */
export function resolveGridImageUrl(
  img: ImageRecord,
  sasToken?: string | null,
): string | null {
  const name = blobNameOf(img);
  if (name && sasToken) {
    return buildThumbnailUrl(name, sasToken);
  }
  return firstUsable(img.thumbnailUrl, img.compressedUrl);
}

/**
 * Lightbox / popover detail — compressedimages from blobName + sasToken,
 * else legacy compressedUrl / thumbnailUrl.
 */
export function resolveDetailImageUrl(
  img: ImageRecord,
  sasToken?: string | null,
): string | null {
  const name = blobNameOf(img);
  if (name && sasToken) {
    return buildCompressedUrl(name, sasToken);
  }
  return firstUsable(img.compressedUrl, img.thumbnailUrl);
}

/**
 * @deprecated Prefer resolveGridImageUrl / resolveDetailImageUrl.
 * Kept for callers that need any usable preview (thumb then compressed).
 */
export function resolveCompressedImageUrl(
  img: ImageRecord,
  sasToken?: string | null,
): string | null {
  return resolveGridImageUrl(img, sasToken);
}

/** Drop records with no usable thumb/compressed preview (never show HEIC). */
export function filterDisplayableImages(
  images: ImageRecord[],
  sasToken?: string | null,
): {
  displayable: ImageRecord[];
  hiddenHeicOrMissing: number;
} {
  const displayable: ImageRecord[] = [];
  let hiddenHeicOrMissing = 0;
  for (const img of images) {
    const url =
      resolveGridImageUrl(img, sasToken) ??
      resolveDetailImageUrl(img, sasToken);
    if (!url) {
      hiddenHeicOrMissing += 1;
      continue;
    }
    displayable.push({ ...img, _displayUrl: url });
  }
  return { displayable, hiddenHeicOrMissing };
}

export function displayUrlOf(
  img: ImageRecord,
  sasToken?: string | null,
): string | undefined {
  const tagged = img._displayUrl;
  if (typeof tagged === "string" && tagged.length > 0) return tagged;
  return resolveGridImageUrl(img, sasToken) ?? undefined;
}

/**
 * Basename for ensureThumbnails — prefer slim `blobName`, else path of
 * compressed/thumbnail URL, else name / RowKey normalized to `.webp`.
 */
export function blobBasenameOf(img: ImageRecord): string | null {
  const slim = typeof img.blobName === "string" ? img.blobName.trim() : "";
  if (slim) {
    const base = slim.split("/").pop() || slim;
    if (HEIC_RE.test(base)) return base.replace(/\.heic$/i, ".webp");
    return base;
  }

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
 * Prefer blobName / basename of the display URL (.webp).
 */
export function displayImageLabel(img: ImageRecord): string {
  const fromBlob = blobBasenameOf(img);
  if (fromBlob) return fromBlob;
  return "Image";
}
