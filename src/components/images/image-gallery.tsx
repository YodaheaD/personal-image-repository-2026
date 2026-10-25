"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { GalleryLightbox } from "@/components/images/gallery-lightbox";
import type { ImageRecord } from "@/lib/api/types";
import {
  displayImageLabel,
  resolveDetailImageUrl,
  resolveGridImageUrl,
} from "@/lib/image-urls";

interface Props {
  images: ImageRecord[];
  /** Shared SAS from paginated response — builds thumb/compressed URLs. */
  sasToken?: string | null;
}

/**
 * Azure blob URLs are loaded with unoptimized next/image so the App Service
 * never proxies them through /_next/image (409 when the optimizer cannot
 * anonymously fetch private compressedimages / thumbnailimages blobs).
 */
function BlobImage({
  src,
  fallbackSrc,
  alt,
  className,
  sizes,
}: {
  src: string;
  /** On 404/403 (missing thumb), swap to this URL once. */
  fallbackSrc?: string | null;
  alt: string;
  className?: string;
  sizes?: string;
}) {
  const [current, setCurrent] = useState(src);

  useEffect(() => {
    setCurrent(src);
  }, [src]);

  return (
    <Image
      src={current}
      alt={alt}
      fill
      sizes={sizes}
      unoptimized
      className={className}
      onError={() => {
        if (fallbackSrc && current !== fallbackSrc) {
          setCurrent(fallbackSrc);
        }
      }}
    />
  );
}

export function ImageGallery({ images, sasToken }: Props) {
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);

  if (images.length === 0) {
    return (
      <p className="py-12 text-center text-sm text-[var(--muted-foreground)]">
        No images match the current filters.
      </p>
    );
  }

  return (
    <>
      <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-6">
        {images.map((img, index) => {
          const id = String(img.RowKey ?? img.blobName ?? img.name ?? index);
          const gridSrc = resolveGridImageUrl(img, sasToken);
          const detailSrc = resolveDetailImageUrl(img, sasToken);
          const title = displayImageLabel(img);

          if (!gridSrc && !detailSrc) return null;

          const cellSrc = gridSrc ?? detailSrc!;
          const cellFallback =
            detailSrc && detailSrc !== cellSrc ? detailSrc : null;

          return (
            <li key={id} className="min-w-0">
              <button
                type="button"
                className="relative aspect-square w-full overflow-hidden rounded-md border border-[var(--border)] bg-[var(--muted)] text-left outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]"
                aria-label={`Open ${title}`}
                onClick={() => setViewerIndex(index)}
              >
                <BlobImage
                  src={cellSrc}
                  fallbackSrc={cellFallback}
                  alt={title}
                  sizes="(max-width:640px) 50vw, (max-width:768px) 33vw, (max-width:1024px) 25vw, (max-width:1280px) 20vw, 16vw"
                  className="object-cover"
                />
              </button>
            </li>
          );
        })}
      </ul>

      <GalleryLightbox
        images={images}
        sasToken={sasToken}
        index={viewerIndex}
        onIndexChange={setViewerIndex}
      />
    </>
  );
}
