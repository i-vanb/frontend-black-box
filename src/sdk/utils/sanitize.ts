const SENSITIVE_KEYS = [
  "password",
  "pass",
  "token",
  "accessToken",
  "refreshToken",
  "authorization",
  "cookie",
  "secret",
  "apiKey",
];

export function sanitizeValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(sanitizeValue);
  }

  if (value && typeof value === "object") {
    return sanitizeObject(value as Record<string, unknown>);
  }

  return value;
}

function sanitizeObject(object: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(object).map(([key, value]) => {
      if (isSensitiveKey(key)) {
        return [key, "[Filtered]"];
      }

      return [key, sanitizeValue(value)];
    }),
  );
}

function isSensitiveKey(key: string): boolean {
  const normalizedKey = key.toLowerCase();

  return SENSITIVE_KEYS.some((sensitiveKey) => normalizedKey.includes(sensitiveKey.toLowerCase()));
}
