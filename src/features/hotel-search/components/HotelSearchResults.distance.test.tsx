import { onlineManager } from "@tanstack/react-query";
import { screen } from "@testing-library/react";
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

describe("HotelSearchResults: distância no card (critérios 1 e 6)", () => {
  it("cada card mostra a distância do centro em qualquer ordenação", async () => {
    stubApi();
    start();
    await screen.findAllByRole("heading", { level: 3 });
    expect(screen.getAllByText(/do centro$/, { selector: "p" })).toHaveLength(10);
  });

  it("falha do centroide: a lista aparece sem a linha de distância", async () => {
    stubApi((url) =>
      url.searchParams.has("_page") ? paged(url) : new Response("{}", { status: 500 }),
    );
    start();
    expect(await screen.findAllByRole("heading", { level: 3 })).toHaveLength(10);
    expect(screen.queryByText(/do centro$/, { selector: "p" })).not.toBeInTheDocument();
  });

  it("destino com 1 hotel não mostra distância", async () => {
    stubApi(() => hotelsResponse(ALL.slice(0, 1), 1));
    start();
    await screen.findAllByRole("heading", { level: 3 });
    expect(screen.queryByText(/do centro$/, { selector: "p" })).not.toBeInTheDocument();
  });
});

const HELP = "Distância em linha reta até o ponto médio dos hotéis de Rio de Janeiro, RJ.";

const cardNames = () =>
  screen.getAllByRole("heading", { level: 3 }).map((heading) => heading.textContent);

describe("HotelSearchResults: ordenação por distância (critérios 2, 3 e 5)", () => {
  it("escolher 'Distância do centro' grava a URL, mantém o foco e ordena pelo centroide", async () => {
    const user = userEvent.setup();
    const fetchMock = stubApi();
    start();
    await screen.findAllByRole("heading", { level: 3 });
    expect(screen.queryByText(HELP)).not.toBeInTheDocument();

    const select = screen.getByRole("combobox", { name: "Ordenar por" });
    await user.selectOptions(select, "Distância do centro");
    expect(window.location.search).toContain("sort=distance");
    expect(select).toHaveFocus();
    await screen.findByText(HELP);
    expect(select).toHaveAccessibleDescription(HELP);
    await vi.waitFor(() =>
      expect(cardNames().slice(0, 4)).toEqual(["Hotel 7", "Hotel 8", "Hotel 6", "Hotel 9"]),
    );
    expect(screen.getByText("Mostrando 1–10 de 14")).toBeInTheDocument();
    expect(cardNames()).toHaveLength(10);

    for (const url of requestedUrls(fetchMock).filter((item) => item.search.includes("distance"))) {
      expect(url.searchParams.has("_sort")).toBe(false);
    }
  });

  it("sem filtros sai um request só e a página 2 não faz outro", async () => {
    const fetchMock = stubApi();
    start("&sort=distance");
    await screen.findByText("Hotel 7");
    const calls = fetchMock.mock.calls.length;
    expect(calls).toBe(1);
    const url = requestedUrls(fetchMock)[0];
    expect(url?.searchParams.has("_sort")).toBe(false);
    expect(url?.searchParams.has("_page")).toBe(false);
    expect(url?.searchParams.has("_limit")).toBe(false);
  });

  it("página 2 por distância traz os 4 mais distantes com o mesmo request da lista inteira", async () => {
    const fetchMock = stubApi();
    start("&sort=distance&page=2");
    await vi.waitFor(() =>
      expect(cardNames()).toEqual(["Hotel 2", "Hotel 13", "Hotel 1", "Hotel 14"]),
    );
    expect(screen.getByText("Mostrando 11–14 de 14")).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledOnce();
  });
});

describe("HotelSearchResults: centroide obrigatório em distance (critério 6)", () => {
  it("falha leva ao ErrorState e 'Tentar de novo' recupera", async () => {
    const user = userEvent.setup();
    let fail = true;
    stubApi((url) => (fail ? new Response("{}", { status: 500 }) : paged(url)));
    start("&sort=distance");
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Não foi possível carregar os hotéis",
    );
    fail = false;
    await user.click(screen.getByRole("button", { name: "Tentar de novo" }));
    expect(await screen.findByText("Hotel 7")).toBeInTheDocument();
  });
});
