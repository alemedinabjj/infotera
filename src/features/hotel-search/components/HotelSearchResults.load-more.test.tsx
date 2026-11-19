import { onlineManager } from "@tanstack/react-query";
import { act, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ALL, hotelsResponse, paged, requestedUrls, start, stubApi } from "../testing/harness";
import { installFakeIntersectionObserver, triggerIntersection } from "../testing/intersection";

vi.mock(
  "next/navigation",
  async () => (await import("@/shared/testing/next-navigation")).navigationMock,
);

beforeEach(() => {
  onlineManager.setOnline(true);
  installFakeIntersectionObserver();
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

const articles = () => screen.getAllByRole("article");
const announcer = () => document.querySelector<HTMLElement>("p.sr-only[aria-live='polite']");
const secondBatchCalls = (fetchMock: ReturnType<typeof stubApi>) =>
  requestedUrls(fetchMock).filter((url) => url.searchParams.get("_page") === "2");

/** Segura o 2º lote até `release()`; o resto responde na hora. */
const holdSecondBatch = () => {
  const releases: Array<() => void> = [];
  const fetchMock = stubApi(async (url) => {
    if (url.searchParams.get("_page") === "2") {
      await new Promise<void>((resolve) => {
        releases.push(resolve);
      });
    }
    return paged(url);
  });
  const release = () =>
    act(() => {
      for (const done of releases) done();
    });
  return { fetchMock, release };
};

describe("feed: carregamento automático (critério 12)", () => {
  it("o rodapé perto da janela pede o lote 2; anuncia e termina com 'Voltar ao topo'", async () => {
    const { fetchMock, release } = holdSecondBatch();
    start("&view=infinite");
    await screen.findAllByRole("article");
    expect(screen.getByRole("button", { name: "Carregar mais hotéis" })).toBeInTheDocument();
    expect(secondBatchCalls(fetchMock)).toHaveLength(0);

    triggerIntersection();
    expect(await screen.findByRole("button", { name: "Carregando mais hotéis…" })).toHaveAttribute(
      "aria-busy",
      "true",
    );
    expect(screen.getByRole("feed")).toHaveAttribute("aria-busy", "true");
    // O botão já diz "Carregando…": o anunciador geral fica mudo (sem leitura dupla).
    expect(announcer()).toBeEmptyDOMElement();

    release();
    await waitFor(() => expect(articles()).toHaveLength(14));
    expect(announcer()).toHaveTextContent("Mais 4 hotéis carregados. Mostrando 14 de 14.");
    expect(screen.getByText("Você viu todos os 14 hotéis.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Voltar ao topo" })).toBeInTheDocument();
    expect(screen.getByRole("feed")).toHaveAttribute("aria-busy", "false");
    expect(secondBatchCalls(fetchMock)).toHaveLength(1);
  });

  it("carga por rolagem não mexe no foco", async () => {
    stubApi();
    start("&view=infinite");
    const first = (await screen.findAllByRole("article"))[0];
    first?.focus();
    triggerIntersection();
    await waitFor(() => expect(articles()).toHaveLength(14));
    expect(first).toHaveFocus();
  });

  it("com um lote só o rodapé já é o fim", async () => {
    stubApi(() => hotelsResponse(ALL.slice(0, 3), 3));
    start("&view=infinite");
    expect(await screen.findByText("Você viu todos os 3 hotéis.")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Carregar mais hotéis" })).not.toBeInTheDocument();
  });
});

describe("feed: foco por teclado (critério 13)", () => {
  it("Enter no botão leva o foco ao 11º card", async () => {
    const user = userEvent.setup();
    stubApi();
    start("&view=infinite");
    await screen.findAllByRole("article");
    const button = screen.getByRole("button", { name: "Carregar mais hotéis" });
    button.focus();
    await user.keyboard("{Enter}");
    await waitFor(() => expect(articles()).toHaveLength(14));
    const eleventh = articles()[10];
    expect(eleventh).toHaveAttribute("aria-posinset", "11");
    expect(eleventh).toHaveFocus();
  });

  it("carregamento automático com o foco no botão dá o mesmo resultado", async () => {
    stubApi();
    start("&view=infinite");
    await screen.findAllByRole("article");
    screen.getByRole("button", { name: "Carregar mais hotéis" }).focus();
    triggerIntersection();
    await waitFor(() => expect(articles()).toHaveLength(14));
    await waitFor(() => expect(articles()[10]).toHaveFocus());
  });
});

describe("feed: falha no lote (critério 16)", () => {
  it("mantém os 10 cards, não repete sozinho e 'Tentar de novo' carrega o lote", async () => {
    const user = userEvent.setup();
    let fail = true;
    const fetchMock = stubApi((url) =>
      fail && url.searchParams.get("_page") === "2"
        ? new Response("{}", { status: 500 })
        : paged(url),
    );
    start("&view=infinite");
    await screen.findAllByRole("article");
    triggerIntersection();

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("Não foi possível carregar mais hotéis.");
    expect(alert).toHaveTextContent("Os hotéis já carregados continuam aqui.");
    expect(articles()).toHaveLength(10);

    // O automático não re-dispara com erro no lote.
    const calls = secondBatchCalls(fetchMock).length;
    triggerIntersection();
    expect(secondBatchCalls(fetchMock)).toHaveLength(calls);

    fail = false;
    const retry = screen.getByRole("button", { name: "Tentar de novo" });
    retry.focus();
    await user.click(retry);
    await waitFor(() => expect(articles()).toHaveLength(14));
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    await waitFor(() => expect(articles()[10]).toHaveFocus());
  });
});

describe("feed: mensagem de erro do lote", () => {
  it("é trazida à vista (nearest) sem mover o foco do botão", async () => {
    const scrollIntoView = vi.fn();
    Object.defineProperty(HTMLElement.prototype, "scrollIntoView", {
      value: scrollIntoView,
      configurable: true,
    });
    vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockReturnValue(
      new DOMRect(0, 5000, 300, 80),
    );
    stubApi((url) =>
      url.searchParams.get("_page") === "2" ? new Response("{}", { status: 500 }) : paged(url),
    );
    start("&view=infinite");
    await screen.findAllByRole("article");
    const button = screen.getByRole("button", { name: "Carregar mais hotéis" });
    button.focus();
    triggerIntersection();
    await screen.findByRole("alert");
    expect(scrollIntoView).toHaveBeenCalledWith(expect.objectContaining({ block: "nearest" }));
    expect(screen.getByRole("button", { name: "Tentar de novo" })).toHaveFocus();
  });

  it("depois do erro, trocar o filtro não rouba o foco para um card", async () => {
    const user = userEvent.setup();
    stubApi((url) => {
      if (url.searchParams.get("_page") === "2") return new Response("{}", { status: 500 });
      if (url.searchParams.has("rating_gte")) return hotelsResponse(ALL.slice(0, 12), 12);
      return paged(url);
    });
    start("&view=infinite");
    await screen.findAllByRole("article");
    const button = screen.getByRole("button", { name: "Carregar mais hotéis" });
    button.focus();
    await user.click(button);
    await screen.findByRole("alert");
    await user.click(screen.getByRole("radio", { name: /4,5 ou mais/ }));
    await waitFor(() => expect(articles()).toHaveLength(12));
    expect(document.activeElement?.closest("article")).toBeNull();
  });
});

describe("feed: anúncio do lote", () => {
  it("trocar o filtro (4 -> 7 hotéis) não anuncia 'Mais 3 hotéis carregados'", async () => {
    const user = userEvent.setup();
    stubApi((url) =>
      url.searchParams.has("rating_gte")
        ? hotelsResponse(ALL.slice(0, 7), 7)
        : hotelsResponse(ALL.slice(0, 4), 4),
    );
    start("&view=infinite");
    await screen.findAllByRole("article");
    await user.click(screen.getByRole("radio", { name: /4,5 ou mais/ }));
    await waitFor(() => expect(articles()).toHaveLength(7));
    expect(announcer()).not.toHaveTextContent("Mais");
  });
});

describe("feed: rodapé final", () => {
  it("'Voltar ao topo' foca o h2 da contagem", async () => {
    const user = userEvent.setup();
    stubApi();
    start("&view=infinite");
    await screen.findAllByRole("article");
    triggerIntersection();
    await waitFor(() => expect(articles()).toHaveLength(14));
    await user.click(within(document.body).getByRole("button", { name: "Voltar ao topo" }));
    expect(screen.getByRole("heading", { level: 2, name: /14 hotéis encontrados/ })).toHaveFocus();
  });
});
