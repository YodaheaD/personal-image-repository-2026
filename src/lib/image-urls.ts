import type { ImageRecord } from "@/lib/api/types";

const HEIC_RE = /\.heic(?:\?|#|$)/i;
const COMPRESSED_CONTAINER = "compressedimages";

function isHeicUrl(url: string): boolean {
  return HEIC_RE.test(url);
}

/**
 * Gallery/preview URL — Functions PR #4 contract:
 * use `thumbnailUrl` or `compressedUrl` only (both → compressedimages `.webp`).
 * Never HEIC / main / originals. Do not invent URLs from filename/RowKey.
 */
export function resolveCompressedImageUrl(img: ImageRecord): string | null {
  const candidates = [img.thumbnailUrl, img.compressedUrl];
  for (const raw of candidates) {
    if (typeof raw !== "string" || !raw.trim()) continue;
    if (isHeicUrl(raw)) continue;
    if (!raw.includes(`/${COMPRESSED_CONTAINER}/`) && !/\.webp(?:\?|#|$)/i.test(raw)) {
      // Still allow if clearly a non-HEIC compressed asset under another path
      // only when extension is web-safe; otherwise skip.
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
