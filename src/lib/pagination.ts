/**
 * Resolve prev/next from a paginated API payload.
 *
 * Early-stop `/main/paginated` may omit exact `total` / `totalPages` / `sortOrder`.
 * Prefer `hasNextPage` / `hasPreviousPage` (top-level or under `pagination`);
 * fall back to page fullness and current page.
 *
 * Never use the `in` operator on non-objects (malformed JSON can arrive as a string).
 */

import { asPlainObject, parseJsonLenient } from "@/lib/safe-json";
import type { PaginatedResponse } from "@/lib/api/types";

function asBool(value: unknown): boolean | undefined {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    const s = value.trim().toLowerCase();
    if (s === "true" || s === "1") return true;
    if (s === "false" || s === "0") return false;
  }
  if (typeof value === "number" && Number.isFinite(value)) {
    if (value === 1) return true;
    if (value === 0) return false;
  }
  return undefined;
}

function pickBool(
  sources: Record<string, unknown>[],
  keys: string[],
): boolean | undefined {
  for (const obj of sources) {
    for (const key of keys) {
      if (!(key in obj)) continue;
      const b = asBool(obj[key]);
      if (b !== undefined) return b;
    }
  }
  return undefined;
}

function asPositiveInt(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value) && value >= 0) {
    return Math.floor(value);
  }
  if (typeof value === "string" && value.trim() !== "") {
    const n = Number(value);
    if (Number.isFinite(n) && n >= 0) return Math.floor(n);
  }
  return undefined;
}

function pickInt(
  sources: Record<string, unknown>[],
  keys: string[],
): number | undefined {
  for (const obj of sources) {
    for (const key of keys) {
      if (!(key in obj)) continue;
      const n = asPositiveInt(obj[key]);
      if (n !== undefined) return n;
    }
  }
  return undefined;
}

/** Collect top-level + nested `pagination` plain objects for field lookup. */
function paginationSources(res: unknown): Record<string, unknown>[] {
  const root = asPlainObject(res);
  if (!root) return [];
  const nested = asPlainObject(root.pagination);
  return nested ? [root, nested] : [root];
}

/**
 * Coerce a raw paginated API body into a plain object.
 * Strings (axios leftover after failed JSON.parse) are re-parsed leniently.
 * Nested `pagination` nav fields are copied to the top level when missing.
 */
export function normalizePaginatedResponse(raw: unknown): PaginatedResponse {
  let value = raw;
  if (typeof value === "string") {
    value = parseJsonLenient(value);
  }
  const obj = asPlainObject(value);
  if (!obj) {
    throw new Error(
      "Paginated API returned an unexpected payload (expected a JSON object).",
    );
  }

  const nested = asPlainObject(obj.pagination);
  if (!nested) return obj as PaginatedResponse;

  const merged: Record<string, unknown> = { ...obj };
  for (const [key, v] of Object.entries(nested)) {
    if (merged[key] === undefined) merged[key] = v;
  }
  return merged as PaginatedResponse;
}

export function resolvePaginationNav(
  res: unknown,
  opts: {
    requestedLimit: number;
    /** Items returned this page (before client-side hiding). */
    pageItemCount: number;
    currentPage: number;
  },
): { hasPreviousPage: boolean; hasNextPage: boolean } {
  const { requestedLimit, pageItemCount, currentPage } = opts;

  // Defensive: never run `in` on a string / non-object (malformed body).
  // Prefer an already-normalized object from fetchPaginated; if a string slips
  // through, attempt lenient parse so nested `pagination` still applies.
  let payload: unknown = res;
  if (typeof res === "string") {
    try {
      payload = normalizePaginatedResponse(res);
    } catch {
      payload = {};
    }
  }
  const sources = paginationSources(payload);

  const explicitPrev = pickBool(sources, [
    "hasPreviousPage",
    "HasPreviousPage",
    "hasPrevPage",
    "HasPrevPage",
    "hasPrevious",
    "HasPrevious",
  ]);
  const explicitNext = pickBool(sources, [
    "hasNextPage",
    "HasNextPage",
    "hasNext",
    "HasNext",
    "hasMore",
    "HasMore",
  ]);

  const pageSize =
    pickInt(sources, ["limit", "Limit", "pageSize", "PageSize", "page_size"]) ??
    requestedLimit;

  const root = sources[0] ?? {};

  let hasNextPage = explicitNext;
  if (hasNextPage === undefined) {
    if (
      typeof root.continuationToken === "string" &&
      root.continuationToken.length > 0
    ) {
      hasNextPage = true;
    } else if (pageSize > 0 && pageItemCount >= pageSize) {
      hasNextPage = true;
    } else {
      hasNextPage = false;
    }
  }

  const hasPreviousPage = currentPage > 1 && (explicitPrev ?? true);

  return { hasPreviousPage, hasNextPage };
}
