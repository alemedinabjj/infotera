import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useComparisonStore } from "@/shared/saved/stores/comparison";
import { setTestUrl } from "@/shared/testing/next-navigation";
import { renderWithProviders } from "@/shared/testing/render";
import { seedHotel, seedRooms } from "@/shared/testing/seed";
import { ComparisonView } from "./ComparisonView";

vi.mock(
  "next/navigation",
  async () => (await import("@/shared/testing/next-navigation")).navigationMock,
);

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

type Handlers = { hotels?: (url: URL) => Response; rooms?: (url: URL) => Response };

const stub = ({ hotels, rooms }: Handlers = {}) => {
  const calls: string[] = [];
  const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
    const url = new URL(String(input));
    calls.push(`${url.pathname}${url.search}`);
    if (url.pathname === "/hotels") {
      return (
        hotels?.(url) ??
        json(
          url.searchParams
            .getAll("id")
            .flatMap((id) => (id === "999" ? [] : [seedHotel(Number(id))])),
        )
      );
    }
    return (
      rooms?.(url) ??
      json(url.searchParams.getAll("hotelId").flatMap((id) => seedRooms(Number(id))))
    );
  });
  vi.stubGlobal("fetch", fetchMock);
  return calls;
};

beforeEach(() => {
  window.localStorage.clear();
  useComparisonStore.setState({ items: [] });
});

afterEach(() => vi.unstubAllGlobals());

describe("ComparisonView", () => {
  it("3 hotéis: 1 request de hotéis e 1 de quartos, caption e preço pelos quartos", async () => {
    setTestUrl("/compare?hotel=1&hotel=4&hotel=11");
    const calls = stub();
    renderWithProviders(<ComparisonView />);
    const names = [1, 4, 11].map((id) => seedHotel(id).name);
    const table = await screen.findByRole("table", {
      name: `Comparação entre ${names[0]}, ${names[1]} e ${names[2]}`,
    });
    expect(calls.filter((call) => call.startsWith("/hotels"))).toEqual(["/hotels?id=1&id=4&id=11"]);
    expect(calls.filter((call) => call.startsWith("/rooms"))).toEqual([
      "/rooms?hotelId=1&hotelId=4&hotelId=11",
    ]);
    expect(within(table).getByRole("rowheader", { name: /^Preço por noite/ })).toBeInTheDocument();
    expect(within(table).getAllByText(/a partir de R\$\s800/)).toHaveLength(1);
    expect(within(table).getByText("Menor preço")).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 1, name: "Comparar hotéis" })).toBeInTheDocument();
  });

  it("mostra só diferenças e anuncia a contagem", async () => {
    const user = userEvent.setup();
    setTestUrl("/compare?hotel=1&hotel=4");
    stub();
    renderWithProviders(<ComparisonView />);
    await screen.findByRole("table");
    await user.click(screen.getByRole("checkbox", { name: "Mostrar só diferenças" }));
    expect(screen.getByText(/^Mostrando \d+ de \d+ linhas\.$/)).toBeInTheDocument();
  });

  it("link com lixo e repetidos mostra 1, 4 e 7 e não cria bandeja", async () => {
    setTestUrl("/compare?hotel=abc&hotel=1&hotel=1&hotel=4&hotel=7&hotel=9");
    const calls = stub();
    renderWithProviders(<ComparisonView />);
    await screen.findByRole("table");
    expect(calls).toContain("/hotels?id=1&id=4&id=7");
    expect(useComparisonStore.getState().items).toEqual([]);
  });

  it("Remover atualiza a URL por replaceState, tira da bandeja e foca o título", async () => {
    const user = userEvent.setup();
    setTestUrl("/compare?hotel=1&hotel=4&hotel=7");
    useComparisonStore.setState({ items: [{ id: 4, name: seedHotel(4).name }] });
    stub();
    const pushes = vi.spyOn(window.history, "pushState");
    renderWithProviders(<ComparisonView />);
    await screen.findByRole("table");
    await user.click(
      screen.getByRole("button", { name: `Remover ${seedHotel(4).name} da comparação` }),
    );
    expect(window.location.search).toBe("?hotel=1&hotel=7");
    expect(pushes).not.toHaveBeenCalled();
    expect(useComparisonStore.getState().items).toEqual([]);
    expect(screen.getByRole("heading", { level: 1 })).toHaveFocus();
  });

  it("Remover mantém a tabela no DOM enquanto a nova consulta carrega", async () => {
    const user = userEvent.setup();
    setTestUrl("/compare?hotel=1&hotel=4&hotel=7");
    let hold = false;
    const never = new Promise<Response>(() => undefined);
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) => {
        const url = new URL(String(input));
        if (hold) return never;
        if (url.pathname === "/hotels") {
          return json(url.searchParams.getAll("id").map((id) => seedHotel(Number(id))));
        }
        return json(url.searchParams.getAll("hotelId").flatMap((id) => seedRooms(Number(id))));
      }),
    );
    renderWithProviders(<ComparisonView />);
    await screen.findByRole("table");
    hold = true;
    await user.click(
      screen.getByRole("button", { name: `Remover ${seedHotel(4).name} da comparação` }),
    );
    expect(screen.getByRole("table")).toBeInTheDocument();
    expect(screen.queryByText("Carregando a comparação…")).not.toBeInTheDocument();
    expect(screen.queryByText(seedHotel(4).name)).not.toBeInTheDocument();
  });

  it("menos de 2 colunas: Alert com Buscar hotéis em {destino} e Ver favoritos", async () => {
    setTestUrl("/compare?hotel=1");
    stub();
    renderWithProviders(<ComparisonView />);
    expect(
      await screen.findByText("Escolha pelo menos 2 hotéis para comparar"),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: `Buscar hotéis em ${seedHotel(1).destination}` }),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Ver favoritos" })).toHaveAttribute(
      "href",
      "/favorites",
    );
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
  });

  it("sem hotel na URL: vazio, e a bandeja com 2 oferece o link", async () => {
    setTestUrl("/compare");
    useComparisonStore.setState({
      items: [
        { id: 1, name: "A" },
        { id: 4, name: "B" },
      ],
    });
    const calls = stub();
    renderWithProviders(<ComparisonView />);
    expect(await screen.findByText("Nenhum hotel para comparar")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Comparar os 2 hotéis selecionados" })).toHaveAttribute(
      "href",
      "/compare?hotel=1&hotel=4",
    );
    expect(calls).toEqual([]);
  });

  it("id que a API não devolve: coluna some e o Alert avisa", async () => {
    setTestUrl("/compare?hotel=1&hotel=4&hotel=999");
    stub();
    renderWithProviders(<ComparisonView />);
    expect(
      await screen.findByText("1 hotel não foi encontrado e saiu da comparação."),
    ).toBeInTheDocument();
    expect(screen.getAllByRole("columnheader")).toHaveLength(3);
  });

  it("erro só em /rooms: um erro único e o retry refaz só /rooms", async () => {
    const user = userEvent.setup();
    setTestUrl("/compare?hotel=1&hotel=4");
    let failRooms = true;
    const calls = stub({
      rooms: (url) =>
        failRooms
          ? json({ error: "x" }, 500)
          : json(url.searchParams.getAll("hotelId").flatMap((id) => seedRooms(Number(id)))),
    });
    renderWithProviders(<ComparisonView />);
    expect(await screen.findByText("Não foi possível carregar a comparação")).toBeInTheDocument();
    const hotelCalls = calls.filter((call) => call.startsWith("/hotels")).length;
    failRooms = false;
    await user.click(screen.getByRole("button", { name: "Tentar de novo" }));
    await screen.findByRole("table");
    expect(calls.filter((call) => call.startsWith("/hotels")).length).toBe(hotelCalls);
    expect(calls.filter((call) => call.startsWith("/rooms"))).toHaveLength(2);
  });

  it("carregando: skeleton aria-busy", async () => {
    setTestUrl("/compare?hotel=1&hotel=4");
    vi.stubGlobal("fetch", () => new Promise(() => undefined));
    const { container } = renderWithProviders(<ComparisonView />);
    await waitFor(() => expect(container.querySelector("[aria-busy='true']")).not.toBeNull());
    expect(screen.getByText("Carregando a comparação…")).toBeInTheDocument();
  });

  it("headingLevel 2 para o modal: sem h1", async () => {
    setTestUrl("/compare");
    stub();
    renderWithProviders(<ComparisonView headingLevel={2} />);
    expect(
      await screen.findByRole("heading", { level: 2, name: "Comparar hotéis" }),
    ).toBeInTheDocument();
    expect(screen.queryByRole("heading", { level: 1 })).not.toBeInTheDocument();
  });
});
