import { describe, expect, it } from "vitest";
import { cookHrefWithSource, parseCookSource } from "./cook-source";

describe("cook-source", () => {
  it("appends source query", () => {
    expect(cookHrefWithSource("/app/library/abc/cook", "detail")).toBe(
      "/app/library/abc/cook?source=detail",
    );
  });

  it("merges existing query", () => {
    expect(
      cookHrefWithSource("/app/library/abc/cook?voice=1", "sticky_cta"),
    ).toContain("source=sticky_cta");
    expect(
      cookHrefWithSource("/app/library/abc/cook?voice=1", "sticky_cta"),
    ).toContain("voice=1");
  });

  it("parses known sources", () => {
    expect(parseCookSource("sticky_cta")).toBe("sticky_cta");
    expect(parseCookSource("nope")).toBeUndefined();
  });
});
