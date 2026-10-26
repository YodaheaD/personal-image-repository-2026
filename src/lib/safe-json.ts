/**
 * Lenient JSON helpers for Functions payloads that may include non-JSON
 * number tokens (`NaN`, `Infinity`) from Python's default json.dumps.
 */

export function sanitizeNonJsonNumbers(text: string): string {
  return text
    .replace(/\bNaN\b/g, "null")
    .replace(/\b-?Infinity\b/g, "null");
}

/**
 * Parse a JSON string, retrying after replacing bare NaN/Infinity with null.
 * Non-strings are returned as-is.
 */
export function parseJsonLenient(raw: unknown): unknown {
  if (typeof raw !== "string") return raw;
  const trimmed = raw.trim();
  if (!trimmed) {
    throw new Error("Empty response body");
  }
  try {
    return JSON.parse(trimmed) as unknown;
  } catch {
    try {
      return JSON.parse(sanitizeNonJsonNumbers(trimmed)) as unknown;
    } catch {
      throw new Error(
        "Invalid JSON from API (response was not parseable). Check the Functions payload for NaN or other non-JSON values.",
      );
    }
  }
}

export function asPlainObject(
  value: unknown,
): Record<string, unknown> | null {
  if (value !== null && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return null;
}
