// @vitest-environment node
import { describe, expect, it } from "vitest";
import { makeQueryClient } from "./query-client";

describe("makeQueryClient no servidor", () => {
  it("não repete queries (retry 0)", () => {
    expect(typeof window).toBe("undefined");
    expect(makeQueryClient().getDefaultOptions().queries?.retry).toBe(0);
  });
});
