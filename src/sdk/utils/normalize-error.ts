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

  return {
    message: "Unknown error",
    originalValue: error,
  };
}
