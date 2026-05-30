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
});
