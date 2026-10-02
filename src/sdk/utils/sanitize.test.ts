import { describe, expect, it } from "vitest";

import { sanitizeValue } from "./sanitize";

describe("sanitizeValue", () => {
  it("filters sensitive fields", () => {
    const result = sanitizeValue({
      password: "123",
      token: "abc",
      authorization: "Bearer xxx",
      safe: "hello",
    });

    expect(result).toEqual({
      password: "[Filtered]",
      token: "[Filtered]",
      authorization: "[Filtered]",
      safe: "hello",
    });
  });

  it("filters nested sensitive fields", () => {
    const result = sanitizeValue({
      user: {
        name: "Ivan",
        accessToken: "secret",
      },
    });

    expect(result).toEqual({
      user: {
        name: "Ivan",
        accessToken: "[Filtered]",
      },
    });
  });

  it("filters sensitive fields inside arrays", () => {
    const result = sanitizeValue([
      {
        refreshToken: "secret",
        value: 42,
      },
    ]);

    expect(result).toEqual([
      {
        refreshToken: "[Filtered]",
        value: 42,
      },
    ]);
  });

  it("redacts secrets embedded in strings", () => {
    const result = sanitizeValue({
      message: "user ivan@example.com sent Bearer abc.def-123",
    });

    expect(result).toEqual({
      message: "user [FilteredEmail] sent Bearer [Filtered]",
    });
  });

  it("handles cycles, bigint, DOM elements and files safely", () => {
    const cyclic: Record<string, unknown> = { value: 42n };
    cyclic.self = cyclic;

    const result = sanitizeValue({
      cyclic,
      element: document.createElement("button"),
      file: new File(["x"], "private-name.txt", { type: "text/plain" }),
    });

    expect(result).toEqual({
      cyclic: { value: "42n", self: "[Circular]" },
      element: { type: "Element", tagName: "button" },
      file: { type: "File", size: 1, mimeType: "text/plain" },
    });
    expect(() => JSON.stringify(result)).not.toThrow();
  });

  it("bounds deep and oversized values", () => {
    const deep = { a: { b: { c: { d: { e: { f: { g: "hidden" } } } } } } };
    const long = "x".repeat(3_000);
    const result = sanitizeValue({ deep, long }) as Record<string, unknown>;

    expect(JSON.stringify(result)).toContain("[MaxDepth]");
    expect((result.long as string).length).toBe(2_000);
  });
});
