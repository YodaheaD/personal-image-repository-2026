/**
 * Resolve prev/next from a paginated API payload.
 *
 * Early-stop `/main/paginated` may omit exact `total` / `totalPages` / `sortOrder`.
 * Prefer `hasNextPage` / `hasPreviousPage`; fall back to page fullness and current page.
 */

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
  obj: Record<string, unknown>,
  keys: string[],
): boolean | undefined {
  for (const key of keys) {
    if (key in obj) {
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
  obj: Record<string, unknown>,
  keys: string[],
): number | undefined {
  for (const key of keys) {
    if (key in obj) {
      const n = asPositiveInt(obj[key]);
      if (n !== undefined) return n;
    }
  }
  return undefined;
}

export function resolvePaginationNav(
  res: Record<string, unknown>,
  opts: {
    requestedLimit: number;
    /** Items returned this page (before client-side hiding). */
    pageItemCount: number;
    currentPage: number;
  },
): { hasPreviousPage: boolean; hasNextPage: boolean } {
  const { requestedLimit, pageItemCount, currentPage } = opts;

  const explicitPrev = pickBool(res, [
    "hasPreviousPage",
    "HasPreviousPage",
    "hasPrevPage",
    "HasPrevPage",
    "hasPrevious",
    "HasPrevious",
  ]);
  const explicitNext = pickBool(res, [
    "hasNextPage",
    "HasNextPage",
    "hasNext",
    "HasNext",
    "hasMore",
    "HasMore",
  ]);

  const pageSize =
    pickInt(res, ["limit", "Limit", "pageSize", "PageSize", "page_size"]) ??
    requestedLimit;

  let hasNextPage = explicitNext;
  if (hasNextPage === undefined) {
    if (
      typeof res.continuationToken === "string" &&
      res.continuationToken.length > 0
    ) {
      hasNextPage = true;
    } else if (pageSize > 0 && pageItemCount >= pageSize) {
      hasNextPage = true;
    } else {
      hasNextPage = false;
    }
  }

  const hasPreviousPage =
    currentPage > 1 && (explicitPrev ?? true);

  return { hasPreviousPage, hasNextPage };
}
