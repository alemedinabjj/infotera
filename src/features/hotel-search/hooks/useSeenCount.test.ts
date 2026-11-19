import { renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { useSeenCount } from "./useSeenCount";

const items = (...indexes: number[]) => indexes.map((index) => ({ index }));

describe("useSeenCount", () => {
  it("começa em 0 (os primeiros itens ainda animam) e passa a lembrar o maior índice", () => {
    const { result, rerender } = renderHook(({ list }) => useSeenCount("a", list), {
      initialProps: { list: items(0, 1, 2) },
    });
    expect(result.current).toBe(3);
    rerender({ list: items(5, 6) });
    expect(result.current).toBe(7);
  });

  it("rolar de volta não reduz o contador (itens vistos não piscam)", () => {
    const { result, rerender } = renderHook(({ list }) => useSeenCount("a", list), {
      initialProps: { list: items(10, 11) },
    });
    rerender({ list: items(0, 1) });
    expect(result.current).toBe(12);
  });

  it("outra consulta reinicia o contador", () => {
    const { result, rerender } = renderHook(({ key, list }) => useSeenCount(key, list), {
      initialProps: { key: "a", list: items(0, 1, 2) },
    });
    rerender({ key: "b", list: items(0) });
    expect(result.current).toBe(1);
  });
});
