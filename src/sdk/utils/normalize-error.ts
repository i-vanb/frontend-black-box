export type NormalizedError = {
  message: string;
  stack?: string;
  name?: string;
  originalValue?: unknown;
};

export function normalizeError(error: unknown): NormalizedError {
  if (error instanceof Error) {
    return {
      message: error.message,
      ...(error.stack ? { stack: error.stack } : {}),
      ...(error.name ? { name: error.name } : {}),
    };
  }

  if (typeof error === "string") {
    return {
      message: error,
    };
  }

  if (error && typeof error === "object") {
    const record = error as Record<string, unknown>;
    const message = typeof record.message === "string" ? record.message : "Unknown error";

    return {
      message,
      ...(typeof record.stack === "string" ? { stack: record.stack } : {}),
      ...(typeof record.name === "string" ? { name: record.name } : {}),
      originalValue: error,
    };
  }

  return {
    message: "Unknown error",
    originalValue: error,
  };
}
