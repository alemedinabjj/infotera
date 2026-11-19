import { onlineManager } from "@tanstack/react-query";
import { act, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { setViewportHeight, start, stubApi } from "../testing/harness";
import { installFakeIntersectionObserver, triggerIntersection } from "../testing/intersection";

vi.mock(
  "next/navigation",
  async () => (await import("@/shared/testing/next-navigation")).navigationMock,
);

const CARD_HEIGHT = 200;

/** O jsdom não tem layout: cada card mede 200 px (`offsetHeight`, que o virtualizador lê) e a janela 800 px. */
const stubLayout = () => {
  vi.spyOn(HTMLElement.prototype, "offsetHeight", "get").mockImplementation(function measure(
    this: HTMLElement,
  ) {
    return this.tagName === "ARTICLE" ? CARD_HEIGHT : 0;
  });
  // O virtualizador limita a rolagem a `scrollHeight - innerHeight` do documento.
  vi.spyOn(document.documentElement, "scrollHeight", "get").mockReturnValue(20_000);
  setViewportHeight(800);
};

const scrollWindowTo = (top: number) => {
  Object.defineProperty(window, "scrollY", { value: top, configurable: true });
  act(() => {
    window.dispatchEvent(new Event("scroll"));
  });
};

const articles = () => screen.queryAllByRole("article");
const card = (position: number) =>
  articles().find((item) => item.getAttribute("aria-posinset") === String(position));

/** Abre o feed com os 14 hotéis carregados. */
const openFeedWithAll = async () => {
  stubApi();
  start("&view=infinite");
  stubLayout();
  await screen.findAllByRole("article");
  triggerIntersection();
  await screen.findByText("Você viu todos os 14 hotéis.");
};

beforeEach(() => {
  onlineManager.setOnline(true);
  installFakeIntersectionObserver();
  // Como no navegador: rolar para onde já está não dispara `scroll`.
  window.scrollTo = vi.fn(({ top }: ScrollToOptions = {}) => {
    if (top !== undefined && top !== window.scrollY) scrollWindowTo(top);
  });
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  Object.defineProperty(window, "scrollY", { value: 0, configurable: true });
});

describe("feed virtualizado (critérios 14 e 15)", () => {
  it("monta só os cards perto da janela e mantém posinset/setsize", async () => {
    await openFeedWithAll();
    await waitFor(() => expect(articles().length).toBeLessThan(14));
    expect(card(1)).toHaveAttribute("aria-setsize", "14");
    expect(card(14)).toBeUndefined();
    scrollWindowTo(100_000);
    await waitFor(() => expect(card(14)).toBeDefined());
    expect(card(1)).toBeUndefined();
  });

  it("o card com foco continua montado e focado ao sair da janela", async () => {
    await openFeedWithAll();
    await waitFor(() => expect(card(1)).toBeDefined());
    card(1)?.focus();
    await waitFor(() => expect(card(1)).toHaveFocus());
    scrollWindowTo(100_000);
    await waitFor(() => expect(card(14)).toBeDefined());
    expect(card(1)).toBeDefined();
    expect(card(1)).toHaveFocus();
  });
});

describe("feed: teclado do padrão ARIA (critério 14)", () => {
  it("PageDown/PageUp andam entre cards, inclusive para um card fora da janela", async () => {
    const user = userEvent.setup();
    await openFeedWithAll();
    await waitFor(() => expect(card(1)).toBeDefined());
    card(1)?.focus();
    await user.keyboard("{PageDown}");
    await waitFor(() => expect(card(2)).toHaveFocus());
    await user.keyboard("{PageUp}");
    await waitFor(() => expect(card(1)).toHaveFocus());

    const lastMounted = articles().at(-1);
    lastMounted?.focus();
    const position = Number(lastMounted?.getAttribute("aria-posinset"));
    await user.keyboard("{PageDown}");
    await waitFor(() => expect(card(position + 1)).toHaveFocus());
  });

  it("Ctrl+End foca o rodapé e Ctrl+Home foca o título", async () => {
    const user = userEvent.setup();
    await openFeedWithAll();
    await waitFor(() => expect(card(1)).toBeDefined());
    card(1)?.focus();
    await user.keyboard("{Control>}{End}{/Control}");
    expect(screen.getByText("Você viu todos os 14 hotéis.")).toHaveFocus();

    card(1)?.focus();
    await user.keyboard("{Control>}{Home}{/Control}");
    expect(screen.getByRole("heading", { level: 2, name: /14 hotéis encontrados/ })).toHaveFocus();
  });
});
