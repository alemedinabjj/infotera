import { onlineManager } from "@tanstack/react-query";
import { act, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ALL, hotelsResponse, paged, requestedUrls, start, stubApi } from "../testing/harness";

vi.mock(
  "next/navigation",
  async () => (await import("@/shared/testing/next-navigation")).navigationMock,
);

beforeEach(() => {
  onlineManager.setOnline(true);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

const articles = () => screen.getAllByRole("article");

describe("HotelSearchResults: select 'Exibir' (critérios 8 a 10)", () => {
  it("tem rótulo visível e as duas opções", async () => {
    stubApi();
    start();
    await screen.findAllByRole("heading", { level: 3 });
    const select = screen.getByRole("combobox", { name: "Exibir" });
    expect(
      within(select)
        .getAllByRole("option")
        .map((option) => option.textContent),
    ).toEqual(["Em páginas", "Rolagem contínua"]);
    expect(select).toHaveValue("pages");
  });

  it("'Rolagem contínua' grava view=infinite sem page, mantém o foco e não pede nada de novo", async () => {
    const user = userEvent.setup();
    const fetchMock = stubApi();
    start("&sort=price-asc");
    await screen.findAllByRole("heading", { level: 3 });
    const before = fetchMock.mock.calls.length;
    const select = screen.getByRole("combobox", { name: "Exibir" });
    await user.selectOptions(select, "Rolagem contínua");
    expect(window.location.search).toContain("view=infinite");
    expect(window.location.search).not.toContain("page=");
    expect(select).toHaveFocus();
    expect(document.querySelector("[aria-busy='true']:not([role='feed'])")).toBeNull();
    expect(articles()).toHaveLength(10);
    expect(fetchMock.mock.calls.length).toBe(before);
  });

  it("voltar para 'Em páginas' reaproveita o 1º lote em cache", async () => {
    const user = userEvent.setup();
    const fetchMock = stubApi();
    start("&view=infinite");
    await screen.findAllByRole("article");
    const before = fetchMock.mock.calls.length;
    await user.selectOptions(screen.getByRole("combobox", { name: "Exibir" }), "Em páginas");
    expect(window.location.search).not.toContain("view=");
    expect(screen.getByRole("navigation", { name: "Paginação" })).toBeInTheDocument();
    expect(screen.queryByRole("feed")).not.toBeInTheDocument();
    expect(fetchMock.mock.calls.length).toBe(before);
  });

  it("view=xyz cai em páginas e view=infinite ignora page", async () => {
    stubApi();
    const { unmount } = start("&view=xyz");
    await screen.findAllByRole("heading", { level: 3 });
    expect(screen.queryByRole("feed")).not.toBeInTheDocument();
    unmount();
    const fetchMock = stubApi();
    start("&view=infinite&page=2");
    await screen.findAllByRole("article");
    expect(articles()).toHaveLength(10);
    expect(
      requestedUrls(fetchMock)
        .map((url) => url.searchParams.get("_page"))
        .filter((page) => page !== null),
    ).toEqual(["1"]);
  });

  it("'Limpar filtros' mantém sort e view; 'Filtros (n)' não conta a view", async () => {
    const user = userEvent.setup();
    stubApi();
    start("&view=infinite&sort=price-asc&amenity=wifi");
    await screen.findAllByRole("article");
    await user.click(screen.getAllByRole("button", { name: "Limpar filtros" })[0] as HTMLElement);
    expect(window.location.search).toContain("view=infinite");
    expect(window.location.search).toContain("sort=price-asc");
    expect(window.location.search).not.toContain("amenity");
    expect(screen.getByRole("button", { name: "Filtros" })).toBeInTheDocument();
  });
});

describe("HotelSearchResults: feed (critérios 11 e 17)", () => {
  it("role=feed rotulado pelo h2, artigos com posição e tamanho, sem paginação", async () => {
    stubApi();
    start("&view=infinite");
    const feed = await screen.findByRole("feed");
    const heading = screen.getByRole("heading", { level: 2, name: /14 hotéis encontrados/ });
    expect(feed).toHaveAttribute("aria-labelledby", heading.id);
    const items = within(feed).getAllByRole("article");
    expect(items).toHaveLength(10);
    expect(items[0]).toHaveAttribute("aria-posinset", "1");
    expect(items[9]).toHaveAttribute("aria-posinset", "10");
    for (const item of items) expect(item).toHaveAttribute("aria-setsize", "14");
    for (const item of items)
      expect(item).toHaveAccessibleName(expect.stringMatching(/^Hotel \d+/));
    expect(screen.queryByRole("navigation", { name: "Paginação" })).not.toBeInTheDocument();
    expect(screen.getAllByText("Mostrando 10 de 14")).toHaveLength(2);
    expect(heading).not.toHaveTextContent("página");
  });

  it("trocar o filtro no feed esmaece a lista com 'Atualizando resultados…' e volta ao 1º lote", async () => {
    const user = userEvent.setup();
    let release: () => void = () => undefined;
    stubApi(async (url) => {
      if (url.searchParams.has("rating_gte")) {
        await new Promise<void>((resolve) => {
          release = resolve;
        });
        return hotelsResponse(ALL.slice(0, 3), 3);
      }
      return paged(url);
    });
    start("&view=infinite");
    await screen.findAllByRole("article");
    await user.click(screen.getByRole("radio", { name: /4,5 ou mais/ }));
    expect(await screen.findByText("Atualizando resultados…")).toBeInTheDocument();
    expect(screen.getByRole("feed")).toHaveAttribute("aria-busy", "true");
    expect(articles()).toHaveLength(10);
    // O rodapé é do resultado antigo ("Você viu todos os 14"): invisível, mas ocupa o lugar.
    expect(screen.getByText("Você viu todos os 14 hotéis.").parentElement).toHaveClass("invisible");
    act(() => release());
    await waitFor(() => expect(articles()).toHaveLength(3));
    expect(screen.getByText("Mostrando 3 de 3")).toBeInTheDocument();
    expect(screen.getByText("Você viu todos os 3 hotéis.").parentElement).not.toHaveClass(
      "invisible",
    );
  });

  it("erro inicial é o mesmo ErrorState e 'Tentar de novo' recupera", async () => {
    const user = userEvent.setup();
    let fail = true;
    stubApi((url) => (fail ? new Response("{}", { status: 500 }) : paged(url)));
    start("&view=infinite");
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Não foi possível carregar os hotéis",
    );
    fail = false;
    await user.click(screen.getByRole("button", { name: "Tentar de novo" }));
    expect(await screen.findByRole("feed")).toBeInTheDocument();
  });

  it("vazio com filtros", async () => {
    stubApi(() => hotelsResponse([], 0));
    start("&view=infinite&amenity=spa");
    expect(
      await screen.findByRole("heading", { name: "Nenhum hotel com esses filtros" }),
    ).toBeInTheDocument();
  });
});
