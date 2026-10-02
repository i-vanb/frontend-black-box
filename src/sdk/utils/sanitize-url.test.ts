import { describe, expect, it } from "vitest";

import { sanitizeUrl } from "./sanitize-url";

describe("sanitizeUrl", () => {
  it("removes query strings and fragments", () => {
    expect(sanitizeUrl("https://example.test/assets?token=secret#details")).toBe(
      "https://example.test/assets",
    );
  });

  it("redacts UUID and capability-token path segments", () => {
    expect(
      sanitizeUrl("/invite/abcDEF0123456789_secret-token/550e8400-e29b-41d4-a716-446655440000?x=1"),
    ).toBe("/invite/:id/:id");
  });
});
