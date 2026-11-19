import { describe, expect, it } from "vitest";
import {
  deriveFeedFooter,
  describeFeedAnnouncement,
  type FeedFooter,
  feedKeyTarget,
  nextAnnouncementSnapshot,
  withPinnedIndex,
} from "./feed";

describe("deriveFeedFooter", () => {
  it.each([
    [{ hasNextPage: true, isFetchingNextPage: false, isFetchNextPageError: false }, "more"],
    [{ hasNextPage: true, isFetchingNextPage: true, isFetchNextPageError: false }, "loading-more"],
    [{ hasNextPage: true, isFetchingNextPage: false, isFetchNextPageError: true }, "error-more"],
    // "Tentar de novo": o erro persiste até o lote chegar (botão em Tentando…).
    [{ hasNextPage: true, isFetchingNextPage: true, isFetchNextPageError: true }, "error-more"],
    [{ hasNextPage: false, isFetchingNextPage: false, isFetchNextPageError: false }, "end"],
    [{ hasNextPage: false, isFetchingNextPage: true, isFetchNextPageError: false }, "loading-more"],
  ] as const)("%j -> %s", (input, kind) => {
    expect(deriveFeedFooter({ ...input, total: 14 }).kind).toBe(kind);
  });

  it("o fim carrega o total", () => {
    expect(
      deriveFeedFooter({
        hasNextPage: false,
        isFetchingNextPage: false,
        isFetchNextPageError: false,
        total: 14,
      }),
    ).toEqual({ kind: "end", total: 14 });
  });
});

describe("describeFeedAnnouncement", () => {
  const end: FeedFooter = { kind: "end", total: 14 };
  const announce = (previousLoaded: number, loaded: number, total: number, footer: FeedFooter) =>
    describeFeedAnnouncement({ previousLoaded, loaded, total, footer });

  it("carregando: vazio (quem fala é o botão)", () => {
    expect(announce(10, 10, 14, { kind: "loading-more" })).toBe("");
  });

  it("lote novo: plural e singular", () => {
    expect(announce(10, 14, 14, end)).toBe("Mais 4 hotéis carregados. Mostrando 14 de 14.");
    expect(announce(10, 11, 11, { kind: "end", total: 11 })).toBe(
      "Mais 1 hotel carregado. Mostrando 11 de 11.",
    );
    expect(announce(10, 20, 30, { kind: "more" })).toBe(
      "Mais 10 hotéis carregados. Mostrando 20 de 30.",
    );
  });

  it("sem novidade (primeira carga, nada novo, erro): vazio", () => {
    expect(announce(0, 10, 14, { kind: "more" })).toBe("");
    expect(announce(10, 10, 14, { kind: "more" })).toBe("");
    expect(announce(10, 10, 14, { kind: "error-more" })).toBe("");
  });
});

describe("withPinnedIndex", () => {
  it("índice já na janela ou null: não muda", () => {
    expect(withPinnedIndex([2, 3, 4], 3)).toEqual([2, 3, 4]);
    expect(withPinnedIndex([2, 3, 4], null)).toEqual([2, 3, 4]);
  });

  it("índice fora da janela entra, em ordem", () => {
    expect(withPinnedIndex([2, 3, 4], 0)).toEqual([0, 2, 3, 4]);
    expect(withPinnedIndex([2, 3, 4], 9)).toEqual([2, 3, 4, 9]);
    expect(withPinnedIndex([0, 1, 7, 8], 4)).toEqual([0, 1, 4, 7, 8]);
  });

  it("não muta a entrada", () => {
    const input = [2, 3];
    withPinnedIndex(input, 0);
    expect(input).toEqual([2, 3]);
  });
});

describe("feedKeyTarget", () => {
  const key = (name: string, ctrlKey = false, current = 3, count = 10) =>
    feedKeyTarget({ key: name, ctrlKey, current, count });

  it("PageDown/PageUp andam entre cards", () => {
    expect(key("PageDown")).toEqual({ kind: "item", index: 4 });
    expect(key("PageUp")).toEqual({ kind: "item", index: 2 });
  });

  it("nas pontas não há alvo", () => {
    expect(key("PageDown", false, 9)).toBeNull();
    expect(key("PageUp", false, 0)).toBeNull();
  });

  it("Ctrl+End vai para depois e Ctrl+Home para antes", () => {
    expect(key("End", true)).toEqual({ kind: "after" });
    expect(key("Home", true)).toEqual({ kind: "before" });
  });

  it("outras teclas (e End/Home sem Ctrl) são ignoradas", () => {
    expect(key("End")).toBeNull();
    expect(key("Home")).toBeNull();
    expect(key("a")).toBeNull();
    expect(key("PageDown", true)).toBeNull();
  });
});

describe("nextAnnouncementSnapshot", () => {
  const first = { key: "a", batches: 1, loaded: 10, previousLoaded: 10 };

  it("lote novo na mesma consulta: guarda o anterior", () => {
    expect(nextAnnouncementSnapshot(first, { key: "a", batches: 2, loaded: 14 })).toEqual({
      key: "a",
      batches: 2,
      loaded: 14,
      previousLoaded: 10,
    });
  });

  it("filtro novo (4 -> 7 hotéis, mesmo nº de lotes): nada a anunciar", () => {
    const four = { key: "a", batches: 1, loaded: 4, previousLoaded: 4 };
    const switched = nextAnnouncementSnapshot(four, { key: "b", batches: 1, loaded: 4 });
    const arrived = nextAnnouncementSnapshot(switched, { key: "b", batches: 1, loaded: 7 });
    expect(arrived.previousLoaded).toBe(arrived.loaded);
  });

  it("chave nova com mais lotes que a anterior (placeholder): nada a anunciar", () => {
    const next = nextAnnouncementSnapshot(first, { key: "b", batches: 2, loaded: 14 });
    expect(next.previousLoaded).toBe(14);
  });

  it("sem mudança: devolve o mesmo objeto", () => {
    expect(nextAnnouncementSnapshot(first, { key: "a", batches: 1, loaded: 10 })).toBe(first);
  });
});
