import { describe, expect, it } from "vitest";
import { ApiError } from "@/shared/api/http";
import { classifyLoadError } from "./load-result";

describe("classifyLoadError", () => {
  it.each([
    ["404", new ApiError("http", 404, "x"), "missing"],
    ["parse", new ApiError("parse", 200, "x"), "unreadable"],
    ["500", new ApiError("http", 500, "x"), "error"],
    ["400", new ApiError("http", 400, "x"), "error"],
    ["rede", new ApiError("network", null, "x"), "error"],
    ["timeout", new ApiError("timeout", null, "x"), "error"],
    ["Error comum", new Error("x"), "error"],
    ["valor qualquer", "falhou", "error"],
    ["null", null, "error"],
  ])("%s → %s", (_name, error, expected) => {
    expect(classifyLoadError(error)).toBe(expected);
  });
});
