const SENSITIVE_KEYS = [
  "password",
  "passphrase",
  "token",
  "authorization",
  "cookie",
  "secret",
  "apikey",
  "credential",
  "session",
];

const DEFAULT_LIMITS = {
  maxDepth: 6,
  maxKeys: 50,
  maxArrayLength: 50,
  maxStringLength: 2_000,
} as const;

const EMAIL_PATTERN = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi;
const BEARER_PATTERN = /\bBearer\s+[A-Za-z0-9._~+/=-]+/gi;
const JWT_PATTERN = /\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/g;

type SanitizeState = {
  seen: WeakSet<object>;
  depth: number;
};

export function sanitizeValue(value: unknown): unknown {
  return sanitize(value, { seen: new WeakSet<object>(), depth: 0 });
}

function sanitize(value: unknown, state: SanitizeState): unknown {
  if (typeof value === "string") return sanitizeString(value);

  if (
    value === null ||
    typeof value === "boolean" ||
    typeof value === "number" ||
    typeof value === "undefined"
  ) {
    return value;
  }

  if (typeof value === "bigint") return `${value.toString()}n`;
  if (typeof value === "symbol" || typeof value === "function") return `[${typeof value}]`;
  if (state.depth >= DEFAULT_LIMITS.maxDepth) return "[MaxDepth]";
  if (state.seen.has(value)) return "[Circular]";

  state.seen.add(value);
  const nextState = { seen: state.seen, depth: state.depth + 1 };

  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? "[InvalidDate]" : value.toISOString();
  }

  if (value instanceof Error) {
    return sanitizeObject(
      {
        name: value.name,
        message: value.message,
        ...(value.stack ? { stack: value.stack } : {}),
        ...Object.fromEntries(Object.entries(value)),
      },
      nextState,
    );
  }

  if (typeof Element !== "undefined" && value instanceof Element) {
    return { type: "Element", tagName: value.tagName.toLowerCase() };
  }

  if (typeof File !== "undefined" && value instanceof File) {
    return { type: "File", size: value.size, mimeType: value.type || "unknown" };
  }

  if (Array.isArray(value)) {
    return value.slice(0, DEFAULT_LIMITS.maxArrayLength).map((item) => sanitize(item, nextState));
  }

  return sanitizeObject(value as Record<string, unknown>, nextState);
}

function sanitizeObject(
  object: Record<string, unknown>,
  state: SanitizeState,
): Record<string, unknown> {
  const entries: [string, unknown][] = [];

  for (const [key, value] of Object.entries(object).slice(0, DEFAULT_LIMITS.maxKeys)) {
    entries.push([key, isSensitiveKey(key) ? "[Filtered]" : sanitize(value, state)]);
  }

  return Object.fromEntries(entries);
}

function sanitizeString(value: string): string {
  return value
    .slice(0, DEFAULT_LIMITS.maxStringLength)
    .replace(BEARER_PATTERN, "Bearer [Filtered]")
    .replace(JWT_PATTERN, "[FilteredToken]")
    .replace(EMAIL_PATTERN, "[FilteredEmail]");
}

function isSensitiveKey(key: string): boolean {
  const normalizedKey = key.toLowerCase().replaceAll("-", "").replaceAll("_", "");
  return SENSITIVE_KEYS.some((sensitiveKey) => normalizedKey.includes(sensitiveKey));
}
