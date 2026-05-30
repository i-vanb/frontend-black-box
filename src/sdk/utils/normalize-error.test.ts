import { describe, expect, it } from "vitest";

import { normalizeError } from "./normalize-error";

describe("normalizeError", () => {
  it("normalizes Error instance", () => {
    const error = new Error("Boom");

    const result = normalizeError(error);

    expect(result.message).toBe("Boom");
    expect(result.name).toBe("Error");
    expect(result.stack).toBeDefined();
  });

  it("normalizes string error", () => {
    const result = normalizeError("String error");

    expect(result).toEqual({
      message: "String error",
    });
  });

  it("normalizes unknown value", () => {
    const value = { code: 500 };

    const result = normalizeError(value);

    expect(result).toEqual({
      message: "Unknown error",
      originalValue: value,
    });
  });
});
