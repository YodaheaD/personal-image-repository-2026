"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Expand,
  Minus,
  MoreHorizontal,
  Plus,
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { ImageRecord } from "@/lib/api/types";
import { formatDateTakenLong } from "@/lib/dates";
import {
  blobBasenameOf,
  displayImageLabel,
  formatLocationTitle,
  resolveDetailImageUrl,
  resolveGridImageUrl,
} from "@/lib/image-urls";
import { cn } from "@/lib/utils";

const ZOOM_MIN = 1;
const ZOOM_MAX = 3;
const ZOOM_STEP = 0.1;

interface Props {
  images: ImageRecord[];
  sasToken?: string | null;
  /** Index into `images` when open; null when closed. */
  index: number | null;
  onIndexChange: (index: number | null) => void;
}

function ThumbImage({
  src,
  fallbackSrc,
  alt,
  className,
}: {
  src: string;
  fallbackSrc?: string | null;
  alt: string;
  className?: string;
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
      sizes="80px"
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

async function downloadImage(url: string, filename: string) {
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const blob = await res.blob();
    const objectUrl = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = objectUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(objectUrl);
  } catch {
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    document.body.appendChild(a);
    a.click();
    a.remove();
  }
}

/**
 * Open compressed image for inline viewing in a new tab.
 * Prefer a same-origin blob: URL typed as image/webp so Azure
 * Content-Disposition: attachment does not force a download.
 * Falls back to window.open(url) if fetch/CORS fails.
 */
async function openCompressedForViewing(url: string) {
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const raw = await res.blob();
    const typed =
      raw.type && raw.type.startsWith("image/")
        ? raw
        : new Blob([raw], { type: "image/webp" });
    const objectUrl = URL.createObjectURL(typed);
    // Open without noopener so we can clear opener; noopener makes open()
    // return null and would falsely look like a blocked popup.
    const win = window.open(objectUrl, "_blank");
    if (win) {
      win.opener = null;
    }
    // Revoke after the new tab has had time to load the blob.
    window.setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000);
  } catch {
    // Best-effort if fetch/CORS fails — Storage may still force download
    // via Content-Disposition: attachment.
    window.open(url, "_blank", "noopener,noreferrer");
  }
}

export function GalleryLightbox({
  images,
  sasToken,
  index,
  onIndexChange,
}: Props) {
  const open = index != null && index >= 0 && index < images.length;
  const active = open && index != null ? images[index] : null;
  const [zoom, setZoom] = useState(ZOOM_MIN);
  const activeThumbRef = useRef<HTMLButtonElement | null>(null);

  const canGoPrev = open && index != null && index > 0;
  const canGoNext = open && index != null && index < images.length - 1;

  useEffect(() => {
    setZoom(ZOOM_MIN);
  }, [index]);

  useEffect(() => {
    if (!open) setZoom(ZOOM_MIN);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    activeThumbRef.current?.scrollIntoView({
      behavior: "smooth",
      inline: "center",
      block: "nearest",
    });
  }, [open, index]);

  useEffect(() => {
    if (!open || index == null) return;

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        if (index! > 0) onIndexChange(index! - 1);
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        if (index! < images.length - 1) onIndexChange(index! + 1);
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, index, images.length, onIndexChange]);

  const compressedUrl = active
    ? resolveDetailImageUrl(active, sasToken)
    : null;
  const locationTitle = active ? formatLocationTitle(active) : "";
  const dateLabel = active ? formatDateTakenLong(active.dateTaken) : null;
  const downloadName =
    (active && blobBasenameOf(active)) || "image.webp";

  function close() {
    onIndexChange(null);
  }

  function openInNewTab() {
    if (!compressedUrl) return;
    void openCompressedForViewing(compressedUrl);
  }

  function goPrev() {
    if (index == null || index <= 0) return;
    onIndexChange(index - 1);
  }

  function goNext() {
    if (index == null || index >= images.length - 1) return;
    onIndexChange(index + 1);
  }

  return (
    <AlertDialog
      open={open}
      onOpenChange={(next) => {
        if (!next) close();
      }}
    >
      <AlertDialogContent
        className={cn(
          "fixed inset-0 left-0 top-0 z-50 flex h-svh max-h-svh w-screen max-w-none translate-x-0 translate-y-0 flex-col gap-0 rounded-none border-0 bg-black p-0 text-white shadow-none",
        )}
      >
        <div className="pointer-events-none absolute inset-x-0 top-0 z-20 flex items-start justify-between gap-3 bg-gradient-to-b from-black/80 to-transparent px-3 pb-10 pt-3 sm:px-4">
          <div className="pointer-events-auto flex flex-wrap items-center gap-1 sm:gap-2">
            <button
              type="button"
              className="inline-flex h-9 w-9 items-center justify-center rounded-md text-white/90 hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
              aria-label="Open full image in new tab"
              disabled={!compressedUrl}
              onClick={openInNewTab}
            >
              <Expand className="h-5 w-5" />
            </button>
            <button
              type="button"
              className="inline-flex h-9 w-9 items-center justify-center rounded-md text-white/90 hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
              aria-label="Close viewer"
              onClick={close}
            >
              <ChevronLeft className="h-6 w-6" />
            </button>
            <div className="ml-1 flex items-center gap-1.5 rounded-md bg-black/40 px-2 py-1">
              <button
                type="button"
                className="inline-flex h-7 w-7 items-center justify-center rounded text-white/80 hover:bg-white/10 disabled:opacity-40"
                aria-label="Zoom out"
                disabled={zoom <= ZOOM_MIN}
                onClick={() =>
                  setZoom((z) => Math.max(ZOOM_MIN, +(z - ZOOM_STEP).toFixed(2)))
                }
              >
                <Minus className="h-4 w-4" />
              </button>
              <input
                type="range"
                min={ZOOM_MIN}
                max={ZOOM_MAX}
                step={ZOOM_STEP}
                value={zoom}
                aria-label="Zoom"
                className="h-1 w-20 accent-white sm:w-28"
                onChange={(e) => setZoom(Number(e.target.value))}
              />
              <button
                type="button"
                className="inline-flex h-7 w-7 items-center justify-center rounded text-white/80 hover:bg-white/10 disabled:opacity-40"
                aria-label="Zoom in"
                disabled={zoom >= ZOOM_MAX}
                onClick={() =>
                  setZoom((z) => Math.min(ZOOM_MAX, +(z + ZOOM_STEP).toFixed(2)))
                }
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="pointer-events-none min-w-0 flex-1 px-2 text-center">
            <AlertDialogTitle className="truncate text-sm font-medium text-white sm:text-base">
              {locationTitle}
            </AlertDialogTitle>
            <AlertDialogDescription
              className={cn(
                "mt-0.5 truncate text-xs text-white/60 sm:text-sm",
                !dateLabel && "sr-only",
              )}
            >
              {dateLabel ?? "Image viewer"}
            </AlertDialogDescription>
          </div>

          <div className="pointer-events-auto flex shrink-0 items-center">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="inline-flex h-9 w-9 items-center justify-center rounded-md text-white/90 hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
                  aria-label="More actions"
                >
                  <MoreHorizontal className="h-5 w-5" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="border-white/15 bg-zinc-900 text-white"
              >
                <DropdownMenuItem
                  className="data-[highlighted]:bg-white/10"
                  disabled={!compressedUrl}
                  onSelect={() => {
                    if (!compressedUrl) return;
                    void downloadImage(compressedUrl, downloadName);
                  }}
                >
                  Download
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        <div className="relative flex min-h-0 flex-1 items-center justify-center overflow-hidden px-12 pb-28 pt-16 sm:px-16">
          {compressedUrl ? (
            <div
              className="relative z-0 h-full w-full max-w-5xl transition-transform duration-150 ease-out"
              style={{ transform: `scale(${zoom})` }}
            >
              <Image
                src={compressedUrl}
                alt={active ? displayImageLabel(active) : ""}
                fill
                sizes="100vw"
                unoptimized
                className="pointer-events-none object-contain"
                priority
              />
            </div>
          ) : (
            <p className="text-sm text-white/60">Image unavailable</p>
          )}
        </div>

        {/* Side chevrons: letterbox edges of the dialog (above image/overlays). */}
        {canGoPrev ? (
          <button
            type="button"
            aria-label="Previous image"
            className="pointer-events-auto absolute left-0 top-1/2 z-30 flex h-24 w-12 -translate-y-1/2 items-center justify-center text-white/45 transition-colors hover:text-white/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30 sm:w-14"
            onClick={goPrev}
          >
            <ChevronLeft
              className="h-10 w-10 sm:h-12 sm:w-12"
              strokeWidth={1.25}
            />
          </button>
        ) : null}
        {canGoNext ? (
          <button
            type="button"
            aria-label="Next image"
            className="pointer-events-auto absolute right-0 top-1/2 z-30 flex h-24 w-12 -translate-y-1/2 items-center justify-center text-white/45 transition-colors hover:text-white/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30 sm:w-14"
            onClick={goNext}
          >
            <ChevronRight
              className="h-10 w-10 sm:h-12 sm:w-12"
              strokeWidth={1.25}
            />
          </button>
        ) : null}

        <div className="absolute inset-x-0 bottom-0 z-20 bg-gradient-to-t from-black/90 to-transparent px-2 pb-3 pt-8 sm:px-4">
          <ul
            className="flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            aria-label="Images on this page"
          >
            {images.map((img, i) => {
              const thumb =
                resolveGridImageUrl(img, sasToken) ??
                resolveDetailImageUrl(img, sasToken);
              const detail = resolveDetailImageUrl(img, sasToken);
              if (!thumb && !detail) return null;
              const src = thumb ?? detail!;
              const fallback =
                detail && detail !== src ? detail : null;
              const selected = i === index;
              return (
                <li key={String(img.RowKey ?? img.blobName ?? img.name ?? i)}>
                  <button
                    ref={selected ? activeThumbRef : undefined}
                    type="button"
                    aria-label={`Show ${displayImageLabel(img)}`}
                    aria-current={selected ? "true" : undefined}
                    className={cn(
                      "relative h-14 w-14 shrink-0 overflow-hidden rounded-md border-2 bg-zinc-800 sm:h-16 sm:w-16",
                      selected
                        ? "border-white"
                        : "border-transparent opacity-70 hover:opacity-100",
                    )}
                    onClick={() => onIndexChange(i)}
                  >
                    <ThumbImage
                      src={src}
                      fallbackSrc={fallback}
                      alt=""
                      className="object-cover"
                    />
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      </AlertDialogContent>
    </AlertDialog>
  );
}
