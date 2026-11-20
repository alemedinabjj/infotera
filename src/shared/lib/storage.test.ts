import { afterEach, describe, expect, it, vi } from "vitest";
import { z } from "@/shared/lib/zod";
import { createStorage, STORAGE_PREFIX } from "./storage";

const schema = z.object({ n: z.number() });
const fallback = { n: 0 };

afterEach(() => {
  window.localStorage.clear();
  window.sessionStorage.clear();
});

describe("createStorage", () => {
  it("grava com prefixo e lê de volta validado", () => {
    const storage = createStorage("local");
    storage.write("k", { n: 5 });
    expect(window.localStorage.getItem(`${STORAGE_PREFIX}k`)).toBe('{"n":5}');
    expect(storage.read("k", schema, fallback)).toEqual({ n: 5 });
  });

  it("usa sessionStorage quando pedido", () => {
    createStorage("session").write("k", { n: 1 });
    expect(window.sessionStorage.getItem("infotera:k")).toBe('{"n":1}');
    expect(window.localStorage.getItem("infotera:k")).toBeNull();
  });

  it("devolve o fallback para chave ausente, JSON inválido e schema inválido", () => {
    const storage = createStorage("local");
    expect(storage.read("missing", schema, fallback)).toBe(fallback);
    window.localStorage.setItem("infotera:bad", "{not json");
    expect(storage.read("bad", schema, fallback)).toBe(fallback);
    window.localStorage.setItem("infotera:shape", '{"n":"x"}');
    expect(storage.read("shape", schema, fallback)).toBe(fallback);
  });

  it("devolve o fallback quando getItem lança", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new DOMException("denied", "SecurityError");
    });
    expect(createStorage("local").read("k", schema, fallback)).toBe(fallback);
  });

  it("não lança quando setItem estoura a cota", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new DOMException("full", "QuotaExceededError");
    });
    expect(() => createStorage("local").write("k", { n: 1 })).not.toThrow();
  });

  it("remove a chave com prefixo e não lança se falhar", () => {
    const storage = createStorage("local");
    storage.write("k", { n: 1 });
    storage.remove("k");
    expect(window.localStorage.getItem("infotera:k")).toBeNull();
    vi.spyOn(Storage.prototype, "removeItem").mockImplementation(() => {
      throw new Error("boom");
    });
    expect(() => storage.remove("k")).not.toThrow();
  });
});
