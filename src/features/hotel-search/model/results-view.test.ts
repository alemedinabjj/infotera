import { describe, expect, it } from "vitest";
import {
  deriveResultsView,
  describeAnnouncement,
  describePageSuffix,
  describeResultCount,
  describeSheetAction,
  describeToolbar,
  describeVisibleRange,
  outOfRangePage,
  type ResultsView,
  type ResultsViewInput,
} from "./results-view";

const BASE: ResultsViewInput = {
  hasData: true,
  isError: false,
  isPlaceholderData: false,
  isPaused: false,
  total: 14,
  page: 1,
  hasActiveFilters: false,
};

const view = (overrides: Partial<ResultsViewInput>) => deriveResultsView({ ...BASE, ...overrides });

describe("deriveResultsView", () => {
  it.each<[string, Partial<ResultsViewInput>, ResultsView]>([
    ["sem dados e carregando", { hasData: false, total: 0 }, { kind: "loading" }],
    ["sem dados com erro", { hasData: false, isError: true }, { kind: "error" }],
    ["sem dados e sem rede", { hasData: false, isPaused: true }, { kind: "offline" }],
    ["erro vence sem rede", { hasData: false, isError: true, isPaused: true }, { kind: "error" }],
    ["resultados", {}, { kind: "results", stale: false, offlineWithData: false }],
    [
      "placeholder (troca em andamento)",
      { isPlaceholderData: true },
      { kind: "results", stale: true, offlineWithData: false },
    ],
    ["placeholder + erro", { isPlaceholderData: true, isError: true }, { kind: "error" }],
    ["placeholder + sem rede", { isPlaceholderData: true, isPaused: true }, { kind: "offline" }],
    [
      "dados da mesma chave + sem rede",
      { isPaused: true },
      { kind: "results", stale: false, offlineWithData: true },
    ],
    [
      "dados + erro de refetch em segundo plano",
      { isError: true },
      { kind: "results", stale: false, offlineWithData: false },
    ],
    ["vazio do destino", { total: 0 }, { kind: "empty-destination" }],
    ["vazio com filtros", { total: 0, hasActiveFilters: true }, { kind: "empty-filters" }],
    [
      "zero antigo durante a troca espera o novo",
      { total: 0, isPlaceholderData: true },
      { kind: "loading" },
    ],
    ["página fora do intervalo", { page: 5 }, { kind: "out-of-range", lastPage: 2 }],
    [
      "página fora do intervalo em placeholder fica stale",
      { page: 5, isPlaceholderData: true },
      { kind: "results", stale: true, offlineWithData: false },
    ],
    [
      "última página válida",
      { page: 2 },
      { kind: "results", stale: false, offlineWithData: false },
    ],
  ])("%s", (_label, overrides, expected) => {
    expect(view(overrides)).toEqual(expected);
  });
});

describe("outOfRangePage", () => {
  it("devolve a última página só quando passou do fim com total > 0", () => {
    expect(outOfRangePage(5, 14)).toBe(2);
    expect(outOfRangePage(2, 14)).toBeNull();
    expect(outOfRangePage(3, 0)).toBeNull();
    expect(outOfRangePage(2, 10)).toBe(1);
  });
});

describe("textos", () => {
  it("describeResultCount: 0, 1 e n", () => {
    expect(describeResultCount(0)).toBe("Nenhum hotel encontrado");
    expect(describeResultCount(1)).toBe("1 hotel encontrado");
    expect(describeResultCount(14)).toBe("14 hotéis encontrados");
  });

  it("describePageSuffix só com mais de uma página", () => {
    expect(describePageSuffix(2, 14)).toBe(", página 2 de 2");
    expect(describePageSuffix(1, 10)).toBe("");
    expect(describePageSuffix(1, 0)).toBe("");
  });

  it("describeVisibleRange", () => {
    expect(describeVisibleRange(1, 14)).toBe("Mostrando 1–10 de 14");
    expect(describeVisibleRange(2, 14)).toBe("Mostrando 11–14 de 14");
    expect(describeVisibleRange(1, 1)).toBe("Mostrando 1–1 de 1");
  });

  it("describeAnnouncement por visão", () => {
    const announce = (v: ResultsView, slow = false) =>
      describeAnnouncement({ view: v, slow, total: 14, destination: "Bonito, MS" });
    expect(announce({ kind: "loading" })).toBe("Carregando hotéis…");
    expect(announce({ kind: "loading" }, true)).toBe("Está demorando mais que o normal…");
    expect(announce({ kind: "results", stale: false, offlineWithData: false })).toBe(
      "14 hotéis encontrados",
    );
    expect(announce({ kind: "results", stale: true, offlineWithData: false })).toBe("");
    expect(announce({ kind: "empty-filters" })).toBe("Nenhum hotel com esses filtros");
    expect(announce({ kind: "empty-destination" })).toBe("Nenhum hotel em Bonito, MS");
    expect(announce({ kind: "error" })).toBe("");
    expect(announce({ kind: "offline" })).toBe("");
    expect(announce({ kind: "out-of-range", lastPage: 2 })).toBe("");
  });
});

describe("describeToolbar", () => {
  const toolbar = (v: ResultsView, slow = false, total = 14, page = 1) =>
    describeToolbar({ view: v, slow, total, page });

  it("carregando: skeleton + spinner, e 'demorando' depois de 5 s", () => {
    expect(toolbar({ kind: "loading" })).toEqual({
      heading: { kind: "skeleton" },
      status: { kind: "spinner", text: "Carregando hotéis…" },
    });
    expect(toolbar({ kind: "loading" }, true).status).toEqual({
      kind: "spinner",
      text: "Está demorando mais que o normal…",
    });
  });

  it("resultados: contagem, sufixo de página e faixa", () => {
    expect(
      toolbar({ kind: "results", stale: false, offlineWithData: false }, false, 14, 2),
    ).toEqual({
      heading: { kind: "text", text: "14 hotéis encontrados", srSuffix: ", página 2 de 2" },
      status: { kind: "text", text: "Mostrando 11–14 de 14" },
    });
  });

  it("stale: mantém a contagem anterior e mostra Atualizando", () => {
    expect(toolbar({ kind: "results", stale: true, offlineWithData: false }).status).toEqual({
      kind: "spinner",
      text: "Atualizando resultados…",
    });
  });

  it("vazios e erro/offline", () => {
    expect(toolbar({ kind: "empty-filters" })).toMatchObject({
      heading: { text: "Nenhum hotel encontrado" },
      status: { kind: "none" },
    });
    expect(toolbar({ kind: "error" }).heading).toMatchObject({ text: "Resultados indisponíveis" });
    expect(toolbar({ kind: "offline" }).status).toEqual({ kind: "none" });
  });
});

describe("describeSheetAction", () => {
  const action = (v: ResultsView, total = 14) => describeSheetAction(v, total);
  const results = (stale: boolean): ResultsView => ({
    kind: "results",
    stale,
    offlineWithData: false,
  });

  it("resultado esperado no primário", () => {
    expect(action(results(false))).toEqual({ text: "Ver 14 hotéis", updating: false });
    expect(action(results(false), 1)).toEqual({ text: "Ver 1 hotel", updating: false });
  });

  it("durante a troca mostra Atualizando…", () => {
    expect(action(results(true))).toEqual({ text: "Atualizando…", updating: true });
    expect(action({ kind: "loading" }).updating).toBe(true);
  });

  it("sem resultados, erro ou offline: Ver resultados", () => {
    for (const kind of ["empty-filters", "empty-destination", "error", "offline"] as const) {
      expect(action({ kind }, 0)).toEqual({ text: "Ver resultados", updating: false });
    }
  });
});
