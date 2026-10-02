const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const OPAQUE_SEGMENT_PATTERN = /^[A-Za-z0-9_-]{16,}$/;

export function sanitizeUrl(url: string): string {
  try {
    const base = typeof window === "undefined" ? "https://local.invalid" : window.location.origin;
    const parsed = new URL(url, base);
    const path = parsed.pathname
      .split("/")
      .map((segment) => redactPathSegment(segment))
      .join("/");

    if (parsed.origin === base || parsed.origin === "https://local.invalid") {
      return path || "/";
    }

    return `${parsed.origin}${path || "/"}`;
  } catch {
    return "[InvalidUrl]";
  }
}

function redactPathSegment(segment: string): string {
  if (!segment) return segment;

  try {
    const decoded = decodeURIComponent(segment);
    if (
      UUID_PATTERN.test(decoded) ||
      OPAQUE_SEGMENT_PATTERN.test(decoded) ||
      decoded.includes("@")
    ) {
      return ":id";
    }
  } catch {
    return ":redacted";
  }

  return segment.slice(0, 80);
}
