import { describe, expect, it } from "vitest";
import { pushToast, type ToastItemData, toastDuration } from "./toast-model";

const make = (id: number, extra: Partial<ToastItemData> = {}): ToastItemData => ({
  id,
  version: 0,
  tone: "info",
  message: `msg ${id}`,
  duration: 5000,
  ...extra,
});

describe("pushToast", () => {
  it("acrescenta no fim (o mais novo fica embaixo)", () => {
    const list = pushToast([make(1)], make(2));
    expect(list.map((item) => item.id)).toEqual([1, 2]);
  });

  it("key igual substitui no lugar, mantém o id e sobe a version", () => {
    const start = [make(1, { key: "a" }), make(2), make(3, { key: "b" })];
    const list = pushToast(start, make(9, { key: "a", message: "novo" }));
    expect(list.map((item) => item.id)).toEqual([1, 2, 3]);
    expect(list[0]).toMatchObject({ id: 1, version: 1, message: "novo", key: "a" });
    expect(pushToast(list, make(10, { key: "a" }))[0]?.version).toBe(2);
  });

  it("mantém o teto de 3 descartando o mais antigo", () => {
    const list = pushToast([make(1), make(2), make(3)], make(4));
    expect(list.map((item) => item.id)).toEqual([2, 3, 4]);
  });

  it("key nova não substitui itens sem key", () => {
    const list = pushToast([make(1)], make(2, { key: "x" }));
    expect(list).toHaveLength(2);
  });
});

describe("toastDuration", () => {
  it.each([
    ["success", false, undefined, 5000],
    ["info", false, undefined, 5000],
    ["error", false, undefined, 8000],
    ["success", true, undefined, 10_000],
    ["error", true, undefined, 10_000],
    ["info", true, 3000, 3000],
  ] as const)("%s com ação=%s e override=%s dura %s ms", (tone, hasAction, override, expected) => {
    expect(toastDuration(tone, hasAction, override)).toBe(expected);
  });
});
