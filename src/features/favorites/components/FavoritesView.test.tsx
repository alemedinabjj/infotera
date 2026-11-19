import { act, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { FAVORITES_STORAGE_KEY, useFavoritesStore } from "@/shared/saved/stores/favorites";
import { renderWithProviders } from "@/shared/testing/render";
import { seedHotel } from "@/shared/testing/seed";
import { FavoritesView } from "./FavoritesView";

vi.mock(
  "next/navigation",
  async () => (await import("@/shared/testing/next-navigation")).navigationMock,
);

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

const entry = (id: number, day: number) => ({
  id,
  addedAt: `2026-11-${String(day).padStart(2, "0")}T10:00:00.000Z`,
});

const store = async (items: unknown[]) => {
  window.localStorage.setItem(
    FAVORITES_STORAGE_KEY,
    JSON.stringify({ version: 1, state: { items } }),
  );
  await useFavoritesStore.persist.rehydrate();
};

const stubFetch = (handler: (url: URL) => Response) => {
  const fetchMock = vi.fn(async (input: RequestInfo | URL) => handler(new URL(String(input))));
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
};

const hotelsFor = (url: URL) =>
  json(
    url.searchParams
      .getAll("id")
      .flatMap((id) => (Number(id) === 999 ? [] : [seedHotel(Number(id))])),
  );

beforeEach(() => {
  window.localStorage.clear();
  useFavoritesStore.setState({ items: [] });
});

afterEach(() => vi.unstubAllGlobals());

describe("FavoritesView", () => {
  it("3 favoritos: 1 request, do mais recente para o mais antigo, h1 e status", async () => {
    await store([entry(1, 1), entry(4, 3), entry(7, 2)]);
    const fetchMock = stubFetch(hotelsFor);
    renderWithProviders(<FavoritesView />);
    expect(await screen.findByText("3 hotéis salvos")).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 1, name: "Favoritos" })).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledOnce();
    expect(String(fetchMock.mock.calls[0]?.[0])).toMatch(/\/hotels\?id=1&id=4&id=7$/);
    const names = screen
      .getAllByRole("heading", { level: 2 })
      .map((heading) => heading.textContent);
    expect(names).toEqual([seedHotel(4).name, seedHotel(7).name, seedHotel(1).name]);
  });

  it("remover deixa o card no lugar com Desfazer focado; desfazer restaura o addedAt", async () => {
    const user = userEvent.setup();
    await store([entry(1, 1), entry(4, 3)]);
    stubFetch(hotelsFor);
    renderWithProviders(<FavoritesView />);
    const heart = await screen.findByRole("button", {
      name: `Salvar nos favoritos: ${seedHotel(4).name}`,
    });
    await user.click(heart);
    const undo = await screen.findByRole("button", { name: /Desfazer/ });
    await waitFor(() => expect(undo).toHaveFocus());
    expect(screen.getByText("Removido dos favoritos.")).toBeInTheDocument();
    expect(screen.getAllByRole("heading", { level: 2 })).toHaveLength(2);
    expect(screen.queryByRole("status", { name: /Hotel removido/ })).not.toBeInTheDocument();
    await user.click(undo);
    expect(screen.queryByText("Removido dos favoritos.")).not.toBeInTheDocument();
    expect(useFavoritesStore.getState().items.find((item) => item.id === 4)?.addedAt).toBe(
      entry(4, 3).addedAt,
    );
    await waitFor(() => expect(heart).toHaveFocus());
  });

  it("storage com id 999 e item inválido: válidos aparecem e o resto sai do storage", async () => {
    await store([entry(1, 1), entry(999, 2), { id: "x" }]);
    stubFetch(hotelsFor);
    renderWithProviders(<FavoritesView />);
    expect(await screen.findByText("1 hotel salvo")).toBeInTheDocument();
    await waitFor(() => {
      const raw = JSON.parse(window.localStorage.getItem(FAVORITES_STORAGE_KEY) ?? "{}");
      expect(raw.state.items.map((item: { id: number }) => item.id)).toEqual([1]);
    });
  });

  it("vazio: EmptyState com Buscar hotéis e nenhum request", async () => {
    await store([]);
    const fetchMock = stubFetch(hotelsFor);
    renderWithProviders(<FavoritesView />);
    expect(await screen.findByText("Nenhum hotel salvo ainda")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Buscar hotéis" })).toHaveAttribute("href", "/");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("erro: mensagem fixa, storage intacto e retry refaz o request", async () => {
    const user = userEvent.setup();
    await store([entry(1, 1)]);
    let fail = true;
    const fetchMock = stubFetch((url) => (fail ? json({ error: "x" }, 500) : hotelsFor(url)));
    renderWithProviders(<FavoritesView />);
    expect(await screen.findByText("Não foi possível carregar seus favoritos")).toBeInTheDocument();
    expect(useFavoritesStore.getState().items).toHaveLength(1);
    fail = false;
    await user.click(screen.getByRole("button", { name: "Tentar de novo" }));
    expect(await screen.findByText("1 hotel salvo")).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("carregando: skeleton aria-busy e aviso de lentidão depois de 5 s", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    await store([entry(1, 1)]);
    stubFetch(() => new Response(null));
    vi.stubGlobal("fetch", () => new Promise(() => undefined));
    const { container } = renderWithProviders(<FavoritesView />);
    expect(screen.getByText("Carregando seus favoritos…")).toBeInTheDocument();
    expect(container.querySelector("[aria-busy='true']")).not.toBeNull();
    await act(async () => {
      vi.advanceTimersByTime(5000);
    });
    expect(screen.getByText("Está demorando mais que o normal…")).toBeInTheDocument();
    vi.useRealTimers();
  });

  it("cada card tem o checkbox Comparar depois do coração", async () => {
    await store([entry(1, 1)]);
    stubFetch(hotelsFor);
    renderWithProviders(<FavoritesView />);
    const card = (await screen.findByRole("heading", { level: 2 })).closest("article");
    if (!card) throw new Error("card ausente");
    expect(within(card).getByRole("checkbox", { name: /^Comparar/ })).toBeInTheDocument();
  });
});
