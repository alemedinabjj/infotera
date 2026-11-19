import { describe, expect, it } from "vitest";
import { parseCompareParams } from "./compare-params";

const parse = (query: string) => parseCompareParams(new URLSearchParams(query));

describe("parseCompareParams", () => {
  it("lê os ids na ordem", () => {
    expect(parse("hotel=1&hotel=4&hotel=7")).toEqual([1, 4, 7]);
  });

  it("critério 16: ignora inválidos, deduplica e corta em 3", () => {
    expect(parse("hotel=abc&hotel=1&hotel=1&hotel=4&hotel=7&hotel=9")).toEqual([1, 4, 7]);
  });

  it.each(["", "hotel=", "hotel=0", "hotel=-3", "hotel=1.5", "hotel=1e3", "hotel=%201", "x=1"])(
    "%j não gera ids",
    (query) => {
      expect(parse(query)).toEqual([]);
    },
  );

  it("ignora o 4º mesmo que seja válido e rejeita ids enormes", () => {
    expect(parse("hotel=1&hotel=2&hotel=3&hotel=4")).toEqual([1, 2, 3]);
    expect(parse("hotel=99999999999999999999")).toEqual([]);
  });
});
