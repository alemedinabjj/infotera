import { describe, expect, it } from "vitest";
import {
  deriveSuggestionsView,
  describeSuggestionsAnnouncement,
  type SuggestionsViewInput,
  suggestionsErrorMessage,
} from "./suggestions-view";

const base: SuggestionsViewInput = {
  hasQuery: true,
  isDebouncing: false,
  isError: false,
  isRetrying: false,
  isFetching: false,
  isPlaceholderData: false,
  hasData: true,
  itemCount: 3,
  offline: false,
};

describe("deriveSuggestionsView", () => {
  it.each<[string, Partial<SuggestionsViewInput>, ReturnType<typeof deriveSuggestionsView>]>([
    ["sem texto suficiente", { hasQuery: false, hasData: false, itemCount: 0 }, "idle"],
    ["resultados prontos", {}, "results"],
    ["resultados enquanto refaz o fetch", { isFetching: true }, "results"],
    [
      "lista anterior (placeholder) enquanto digita",
      { isDebouncing: true, isPlaceholderData: true },
      "results",
    ],
    ["sem resultado e sem estar carregando", { itemCount: 0 }, "empty"],
    ["sem dados ainda", { hasData: false, itemCount: 0, isFetching: true }, "loading"],
    ["sem resultado mas ainda no debounce", { itemCount: 0, isDebouncing: true }, "loading"],
    ["sem resultado com placeholder", { itemCount: 0, isPlaceholderData: true }, "loading"],
    ["falha da query", { isError: true, hasData: false, itemCount: 0 }, "error"],
    ["falha mesmo com lista antiga", { isError: true }, "error"],
    ["tentando de novo", { isRetrying: true }, "error"],
    [
      "falha durante o debounce não aparece",
      { isError: true, isDebouncing: true, itemCount: 0 },
      "loading",
    ],
    ["offline sem dados da busca atual", { offline: true, hasData: false, itemCount: 0 }, "error"],
    ["offline com placeholder de outra busca", { offline: true, isPlaceholderData: true }, "error"],
    ["offline digitando: lista antiga não vale", { offline: true, isDebouncing: true }, "error"],
    ["offline com cache da própria busca", { offline: true }, "results"],
  ])("%s", (_name, patch, expected) => {
    expect(deriveSuggestionsView({ ...base, ...patch })).toBe(expected);
  });
});

describe("suggestionsErrorMessage", () => {
  it("troca a mensagem quando está offline", () => {
    expect(suggestionsErrorMessage(false)).toBe("Não foi possível carregar os destinos.");
    expect(suggestionsErrorMessage(true)).toMatch(/sem internet/);
  });
});

describe("describeSuggestionsAnnouncement", () => {
  const input = {
    view: "results",
    offline: false,
    itemCount: 3,
    text: "sao",
    isCurrent: true,
  } as const;

  it("anuncia a contagem só quando a lista é a da busca atual", () => {
    expect(describeSuggestionsAnnouncement(input)).toBe("3 destinos encontrados");
    expect(describeSuggestionsAnnouncement({ ...input, isCurrent: false })).toBe("");
    expect(describeSuggestionsAnnouncement({ ...input, view: "empty", itemCount: 0 })).toBe(
      'Nenhum destino encontrado para "sao"',
    );
  });

  it("anuncia o erro (ou o offline) e fica calado em loading/idle", () => {
    expect(describeSuggestionsAnnouncement({ ...input, view: "error" })).toBe(
      suggestionsErrorMessage(false),
    );
    expect(describeSuggestionsAnnouncement({ ...input, view: "error", offline: true })).toBe(
      suggestionsErrorMessage(true),
    );
    expect(describeSuggestionsAnnouncement({ ...input, view: "loading" })).toBe("");
    expect(describeSuggestionsAnnouncement({ ...input, view: "idle" })).toBe("");
  });
});
