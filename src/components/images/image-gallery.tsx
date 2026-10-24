"use client";

import Image from "next/image";
import { useState } from "react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import type { ImageRecord } from "@/lib/api/types";
import { formatEpochMs } from "@/lib/dates";
import { displayImageLabel, displayUrlOf } from "@/lib/image-urls";

interface Props {
  images: ImageRecord[];
}

/**
 * Azure blob URLs are loaded with unoptimized next/image so the App Service
 * never proxies them through /_next/image (409 when the optimizer cannot
 * anonymously fetch private compressedimages blobs).
 */
function BlobImage({
  src,
  alt,
  className,
  sizes,
}: {
  src: string;
  alt: string;
  className?: string;
  sizes?: string;
}) {
  return (
    <Image
      src={src}
      alt={alt}
      fill
      sizes={sizes}
      unoptimized
      className={className}
    />
  );
}

export function ImageGallery({ images }: Props) {
  const [openId, setOpenId] = useState<string | null>(null);

  if (images.length === 0) {
    return (
      <p className="py-12 text-center text-sm text-[var(--muted-foreground)]">
        No images match the current filters.
      </p>
    );
  }

  return (
    <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-6">
      {images.map((img, index) => {
        const id = String(img.RowKey ?? img.name ?? index);
        const src = displayUrlOf(img);
        const title = displayImageLabel(img);
        const open = openId === id;

        if (!src) return null;

        return (
          <li key={id} className="min-w-0">
            <Popover
              open={open}
              onOpenChange={(next) => setOpenId(next ? id : null)}
            >
              <PopoverTrigger asChild>
                <button
                  type="button"
                  className="relative aspect-square w-full overflow-hidden rounded-md border border-[var(--border)] bg-[var(--muted)] text-left outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]"
                  aria-label={`Open metadata for ${title}`}
                >
                  <BlobImage
                    src={src}
                    alt={title}
                    sizes="(max-width:640px) 50vw, (max-width:768px) 33vw, (max-width:1024px) 25vw, (max-width:1280px) 20vw, 16vw"
                    className="object-cover"
                  />
                </button>
              </PopoverTrigger>
              <PopoverContent
                align="start"
                className="max-h-[70vh] w-80 overflow-auto sm:w-96"
              >
                <p className="mb-2 text-sm font-semibold">{title}</p>
                <div className="relative mb-3 h-40 w-full">
                  <BlobImage
                    src={src}
                    alt=""
                    sizes="320px"
                    className="rounded object-contain"
                  />
                </div>
                <dl className="space-y-1.5 text-xs">
                  {Object.entries(img).map(([key, value]) => {
                    if (key === "_displayUrl") return null;
                    if (value == null || value === "") return null;
                    const display =
                      key === "dateTaken"
                        ? formatEpochMs(value as number | string)
                        : typeof value === "object"
                          ? JSON.stringify(value)
                          : String(value);
                    return (
                      <div key={key} className="grid grid-cols-[7rem_1fr] gap-2">
                        <dt className="truncate font-medium text-[var(--muted-foreground)]">
                          {key}
                        </dt>
                        <dd className="break-all text-[var(--foreground)]">
                          {display}
                        </dd>
                      </div>
                    );
                  })}
                </dl>
              </PopoverContent>
            </Popover>
          </li>
        );
      })}
    </ul>
  );
}
