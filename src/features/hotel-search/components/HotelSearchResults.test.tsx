import { onlineManager } from "@tanstack/react-query";
import { act, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Hotel } from "@/shared/api/schemas";
import { makeHotel, makeSearchCriteria } from "@/shared/testing/fixtures";
import { setTestUrl } from "@/shared/testing/next-navigation";
import { renderWithProviders } from "@/shared/testing/render";
import { HotelSearchResults } from "./HotelSearchResults";

vi.mock(
  "next/navigation",
  async () => (await import("@/shared/testing/next-navigation")).navigationMock,
);

/** Enquanto armada, todo card falha ao renderizar (o React tenta mais de uma vez antes de desistir). */
const bomb = vi.hoisted(() => ({ armed: false }));

vi.mock("./HotelCard", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./HotelCard")>();
  const HotelCard = (props: Parameters<typeof actual.HotelCard>[0]) => {
    if (bomb.armed) {
      throw new Error("render falhou");
    }
    return actual.HotelCard(props);
  };
  return { HotelCard };
});

const RIO = "Rio de Janeiro, RJ";
const CRITERIA =
  "destination=Rio+de+Janeiro%2C+RJ&checkIn=2026-12-12&checkOut=2026-12-15&rooms=1&adults=2&children=0";
const criteria = makeSearchCriteria({ checkIn: "2026-12-12", checkOut: "2026-12-15" });

const ALL: Hotel[] = Array.from({ length: 14 }, (_, index) =>
  makeHotel({ id: index + 1, name: `Hotel ${index + 1}`, availableRooms: 9 }),
);

type Handler = (url: URL) => Response | Promise<Response>;

const hotelsResponse = (items: Hotel[], total: number): Response =>
  new Response(JSON.stringify(items), {
    status: 200,
    headers: { "Content-Type": "application/json", "X-Total-Count": String(total) },
  });

/** Responde como a API: 14 hotéis, `_limit` 10 e total no header. */
const paged: Handler = (url) => {
  const page = Number(url.searchParams.get("_page") ?? "1");
  return hotelsResponse(ALL.slice((page - 1) * 10, page * 10), ALL.length);
};

const stubApi = (handler: Handler = paged) => {
  const fetchMock = vi.fn(async (input: string) => handler(new URL(input)));
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
};

const start = (query = "", props: { criteria?: typeof criteria | null } = {}) => {
  setTestUrl(`/search?${CRITERIA}${query}`);
  return renderWithProviders(
    <HotelSearchResults
      destination={RIO}
      criteria={props.criteria === undefined ? criteria : props.criteria}
    />,
  );
};

/** O h2 da contagem (o outro h2 é o "Filtros" da sidebar). */
const countHeading = () =>
  screen.getByRole("heading", { level: 2, name: /encontrados|Resultados|Nenhum/ });

const announcer = () => document.querySelector<HTMLElement>("p.sr-only[aria-live='polite']");

beforeEach(() => {
  onlineManager.setOnline(true);
});

afterEach(() => {
  bomb.armed = false;
  vi.useRealTimers();
  vi.unstubAllGlobals();
  onlineManager.setOnline(true);
});

describe("HotelSearchResults: lista e anúncio (critério 1)", () => {
  it("skeleton com aria-busy e 'Carregando hotéis…' no aria-live, depois 10 cards e a contagem", async () => {
    stubApi();
    start();
    expect(document.querySelector("ul[aria-busy='true']")).toBeInTheDocument();
    expect(announcer()).toHaveTextContent("Carregando hotéis…");
    expect(await screen.findAllByRole("heading", { level: 3 })).toHaveLength(10);
    expect(announcer()).toHaveTextContent("14 hotéis encontrados");
    expect(
      screen.getByRole("heading", { level: 2, name: /14 hotéis encontrados/ }),
    ).toBeInTheDocument();
    expect(screen.getByText("Mostrando 1–10 de 14")).toBeInTheDocument();
    expect(screen.getByRole("region", { name: /14 hotéis encontrados/ })).toBeInTheDocument();
  });

  it("modo browse: cards sem total", async () => {
    stubApi();
    start("", { criteria: null });
    await screen.findAllByRole("heading", { level: 3 });
    expect(screen.queryByText(/total ·/)).not.toBeInTheDocument();
  });
});

describe("HotelSearchResults: paginação (critérios 7 e 8)", () => {
  it("com 14 resultados mostra 2 páginas e links com ?page=", async () => {
    stubApi();
    start();
    await screen.findAllByRole("heading", { level: 3 });
    const nav = screen.getByRole("navigation", { name: "Paginação" });
    expect(within(nav).getByRole("link", { name: "Próxima" })).toHaveAttribute(
      "href",
      `/search?${CRITERIA}&page=2`,
    );
    expect(within(nav).getByRole("link", { name: "Página 1" })).toHaveAttribute(
      "aria-current",
      "page",
    );
  });

  it("página 2 mostra 4 cards e o sufixo de página", async () => {
    stubApi();
    start("&page=2");
    expect(await screen.findAllByRole("heading", { level: 3 })).toHaveLength(4);
    expect(countHeading()).toHaveTextContent("14 hotéis encontrados, página 2 de 2");
  });

  it("com uma página só, não há paginação", async () => {
    stubApi(() => hotelsResponse(ALL.slice(0, 3), 3));
    start();
    await screen.findAllByRole("heading", { level: 3 });
    expect(screen.queryByRole("navigation", { name: "Paginação" })).not.toBeInTheDocument();
  });

  it("page=5 com 14 resultados troca a URL para page=2 sem nova entrada", async () => {
    stubApi();
    const length = window.history.length;
    start("&page=5");
    await waitFor(() => expect(window.location.search).toContain("page=2"));
    expect(window.history.length).toBe(length);
    expect(await screen.findAllByRole("heading", { level: 3 })).toHaveLength(4);
  });

  it("depois de trocar de página o foco vai para o título da contagem", async () => {
    stubApi();
    start();
    await screen.findAllByRole("heading", { level: 3 });
    act(() => window.history.pushState(null, "", `/search?${CRITERIA}&page=2`));
    await waitFor(() => expect(screen.getAllByRole("heading", { level: 3 })).toHaveLength(4));
    await waitFor(() => expect(countHeading()).toHaveFocus());
  });
});

describe("HotelSearchResults: ordenação (critério 13)", () => {
  it("'Menor preço' grava sort=price-asc e pede a ordenação certa à API", async () => {
    const user = userEvent.setup();
    const fetchMock = stubApi();
    start();
    await screen.findAllByRole("heading", { level: 3 });
    await user.selectOptions(screen.getByLabelText("Ordenar por"), "Menor preço");
    expect(window.location.search).toContain("sort=price-asc");
    await waitFor(() =>
      expect(fetchMock.mock.calls.some(([url]) => url.includes("_sort=pricePerNight%2Cid"))).toBe(
        true,
      ),
    );
  });
});

describe("HotelSearchResults: troca sem piscar (critério 18)", () => {
  it("mantém a lista anterior com aria-busy e 'Atualizando resultados…' e só anuncia o dado novo", async () => {
    const user = userEvent.setup();
    let release: (response: Response) => void = () => undefined;
    stubApi();
    start();
    await screen.findAllByRole("heading", { level: 3 });
    vi.stubGlobal(
      "fetch",
      vi.fn(
        () =>
          new Promise<Response>((resolve) => {
            release = resolve;
          }),
      ),
    );
    await user.click(screen.getByRole("checkbox", { name: "Piscina" }));
    expect(await screen.findByText("Atualizando resultados…")).toBeInTheDocument();
    expect(screen.getAllByRole("heading", { level: 3 })).toHaveLength(10);
    expect(document.querySelector("ul[aria-busy='true']")).toBeInTheDocument();
    expect(announcer()).toHaveTextContent("");
    await act(async () => release(hotelsResponse(ALL.slice(0, 4), 4)));
    await waitFor(() => expect(screen.getAllByRole("heading", { level: 3 })).toHaveLength(4));
    expect(announcer()).toHaveTextContent("4 hotéis encontrados");
    expect(screen.queryByText("Atualizando resultados…")).not.toBeInTheDocument();
  });
});

describe("HotelSearchResults: loading lento (critério 19)", () => {
  it("depois de 5 s mostra 'Está demorando mais que o normal…'", async () => {
    vi.useFakeTimers();
    vi.stubGlobal(
      "fetch",
      vi.fn(() => new Promise<Response>(() => undefined)),
    );
    start();
    expect(screen.getAllByText("Carregando hotéis…").length).toBeGreaterThan(0);
    await act(() => vi.advanceTimersByTimeAsync(5100));
    expect(screen.getAllByText("Está demorando mais que o normal…").length).toBeGreaterThan(0);
    expect(announcer()).toHaveTextContent("Está demorando mais que o normal…");
  });
});

describe("HotelSearchResults: vazios (critério 20)", () => {
  it("destino sem hotéis: vazio útil com 'Fazer nova busca'", async () => {
    stubApi(() => hotelsResponse([], 0));
    start();
    expect(
      await screen.findByRole("heading", { name: `Nenhum hotel em ${RIO}` }),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Fazer nova busca" })).toHaveAttribute("href", "/");
    expect(announcer()).toHaveTextContent(`Nenhum hotel em ${RIO}`);
  });

  it("filtros sem resultado: 'Limpar filtros' restaura a lista e leva o foco à contagem", async () => {
    const user = userEvent.setup();
    stubApi((url) => (url.searchParams.has("amenities_like") ? hotelsResponse([], 0) : paged(url)));
    start("&amenity=pool&amenity=spa&amenity=kids_club");
    expect(
      await screen.findByRole("heading", { name: "Nenhum hotel com esses filtros" }),
    ).toBeInTheDocument();
    const empty = screen.getByRole("status");
    await user.click(within(empty).getByRole("button", { name: "Limpar filtros" }));
    expect(window.location.search).toBe(`?${CRITERIA}`);
    expect(await screen.findAllByRole("heading", { level: 3 })).toHaveLength(10);
    await waitFor(() => expect(countHeading()).toHaveFocus());
  });
});

describe("HotelSearchResults: erro e offline (critérios 21 e 23)", () => {
  it("500 mostra ErrorState sem texto da API; 'Tentar de novo' recupera; filtros seguem operáveis", async () => {
    const user = userEvent.setup();
    let fail = true;
    stubApi((url) =>
      fail
        ? new Response(JSON.stringify({ error: "Falha simulada pela mock API" }), { status: 500 })
        : paged(url),
    );
    start();
    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("Não foi possível carregar os hotéis");
    expect(alert).not.toHaveTextContent("Falha simulada");
    expect(
      screen.getByRole("heading", { level: 2, name: "Resultados indisponíveis" }),
    ).toBeInTheDocument();
    await user.click(screen.getByRole("checkbox", { name: "Wi-Fi" }));
    expect(window.location.search).toContain("amenity=wifi");
    fail = false;
    await user.click(screen.getByRole("button", { name: "Tentar de novo" }));
    expect(await screen.findAllByRole("heading", { level: 3 })).toHaveLength(10);
  });

  it("sem rede e sem dados: aviso de sem internet", async () => {
    onlineManager.setOnline(false);
    stubApi();
    start();
    expect(await screen.findByText("Você está sem internet.")).toBeInTheDocument();
    expect(screen.getByText("Os hotéis aparecem assim que a conexão voltar.")).toBeInTheDocument();
    expect(screen.queryByRole("heading", { level: 3 })).not.toBeInTheDocument();
  });

  it("sem rede ao trocar o filtro: a lista dos filtros antigos sai e entra o aviso", async () => {
    const user = userEvent.setup();
    stubApi();
    start();
    await screen.findAllByRole("heading", { level: 3 });
    act(() => onlineManager.setOnline(false));
    await user.click(screen.getByRole("checkbox", { name: "Piscina" }));
    expect(await screen.findByText("Você está sem internet.")).toBeInTheDocument();
    expect(screen.queryByRole("heading", { level: 3 })).not.toBeInTheDocument();
  });
});

describe("HotelSearchResults: error boundary (critério 22)", () => {
  it("erro de renderização cai no fallback só da seção e 'Tentar de novo' remonta", async () => {
    const user = userEvent.setup();
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    stubApi();
    bomb.armed = true;
    start();
    expect(
      await screen.findByRole("heading", { name: "Não foi possível carregar os hotéis" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("group", { name: "Comodidades" })).toBeInTheDocument();
    bomb.armed = false;
    await user.click(screen.getByRole("button", { name: "Tentar de novo" }));
    expect(await screen.findAllByRole("heading", { level: 3 })).toHaveLength(10);
  });
});
