/**
 * Resolve total page count from a paginated API payload.
 *
 * Common bug: response includes `total` but omits `limit` / `totalPages`,
 * so `total && limit ? ceil(total/limit) : 1` always became 1.
 */

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

function pick(
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

export function resolveTotalPages(
  res: Record<string, unknown>,
  opts: {
    requestedLimit: number;
    /** Items returned this page (before client-side hiding). */
    pageItemCount: number;
    currentPage: number;
  },
): number {
  const { requestedLimit, pageItemCount, currentPage } = opts;
  const pageSize =
    pick(res, ["limit", "Limit", "pageSize", "PageSize", "page_size"]) ??
    requestedLimit;

  const explicitPages = pick(res, [
    "totalPages",
    "TotalPages",
    "pageCount",
    "PageCount",
    "pages",
    "Pages",
  ]);
  if (explicitPages !== undefined && explicitPages >= 1) {
    return Math.max(1, explicitPages);
  }

  const total = pick(res, [
    "total",
    "Total",
    "totalCount",
    "TotalCount",
    "totalItems",
    "TotalItems",
    "count",
    "Count",
    "itemCount",
    "ItemCount",
  ]);
  if (total !== undefined && pageSize > 0) {
    return Math.max(1, Math.ceil(total / pageSize));
  }

  // hasMore / continuation without totals
  if (res.hasMore === true || res.HasMore === true) {
    return Math.max(currentPage + 1, 2);
  }
  if (
    typeof res.continuationToken === "string" &&
    res.continuationToken.length > 0
  ) {
    return Math.max(currentPage + 1, 2);
  }

  // Full page of results ⇒ at least one more page may exist
  if (pageSize > 0 && pageItemCount >= pageSize) {
    return Math.max(currentPage + 1, 2);
  }

  return Math.max(1, currentPage);
}
