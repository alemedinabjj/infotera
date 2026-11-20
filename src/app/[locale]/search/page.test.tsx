import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { addDays, todayISO } from "@/shared/lib/dates";
import { setTestUrl } from "@/shared/testing/next-navigation";
import { renderWithProviders } from "@/shared/testing/render";
import SearchPage, { generateMetadata } from "./page";

vi.mock(
  "next/navigation",
  async () => (await import("@/shared/testing/next-navigation")).navigationMock,
);

// `connection()` só existe dentro de uma request do Next; no teste a página é chamada como função.
vi.mock("next/server", () => ({ connection: async () => undefined }));

type Query = Record<string, string>;

const propsFor = (query: Query) => ({
  params: Promise.resolve({ locale: "pt-BR" }),
  searchParams: Promise.resolve(query),
});

const renderPage = async (query: Query) => {
  setTestUrl(`/search?${new URLSearchParams(query).toString()}`);
  return renderWithProviders(await SearchPage(propsFor(query)));
};

const stay = (): Query => ({
  destination: "Rio de Janeiro, RJ",
  checkIn: addDays(todayISO(), 30),
  checkOut: addDays(todayISO(), 33),
  rooms: "1",
  adults: "2",
  children: "0",
});

beforeEach(() => {
  localStorage.clear();
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => new Response("[]", { status: 200, headers: { "X-Total-Count": "0" } })),
  );
});

afterEach(() => vi.unstubAllGlobals());

describe("SearchPage: modos", () => {
  it("sem destino: h1, texto e formulário vazio com nome do h1; sem lista", async () => {
    await renderPage({});
    expect(
      screen.getByRole("heading", { level: 1, name: "Para onde você vai?" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("form", { name: "Para onde você vai?" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Alterar busca" })).not.toBeInTheDocument();
    expect(screen.queryByText(/hotéis encontrados/)).not.toBeInTheDocument();
  });

  it("browse: lista o destino, pede as datas e abre o painel com o destino preenchido", async () => {
    await renderPage({ destination: "Bonito, MS" });
    expect(
      screen.getByRole("heading", { level: 1, name: "Hotéis em Bonito, MS" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Datas não definidas")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Alterar busca" })).toHaveAttribute(
      "aria-expanded",
      "true",
    );
    expect(screen.getByText("Escolha as datas da estadia")).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: /Destino/ })).toHaveValue("Bonito, MS");
    expect(
      await screen.findByRole("heading", { name: "Nenhum hotel em Bonito, MS" }),
    ).toBeInTheDocument();
  });

  it("stay: título, resumo, painel fechado e a lista", async () => {
    await renderPage(stay());
    expect(
      screen.getByRole("heading", { level: 1, name: "Hotéis em Rio de Janeiro, RJ" }),
    ).toBeInTheDocument();
    expect(screen.getByText(/3 noites · 2 adultos · 1 quarto/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Alterar busca" })).toHaveAttribute(
      "aria-expanded",
      "false",
    );
    expect(screen.getByRole("complementary", { name: "Filtros" })).toBeInTheDocument();
    expect(
      await screen.findByRole("heading", { name: "Nenhum hotel em Rio de Janeiro, RJ" }),
    ).toBeInTheDocument();
  });

  it("um único h1 e nenhum <main> (é do layout)", async () => {
    const { container } = await renderPage(stay());
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    expect(container.querySelector("main")).toBeNull();
  });

  it("'Alterar busca' abre o SearchForm preenchido sem buscas recentes", async () => {
    localStorage.setItem(
      "infotera:recent-searches",
      JSON.stringify([{ ...stay(), rooms: 1, adults: 2, children: 0 }]),
    );
    const user = userEvent.setup();
    await renderPage(stay());
    await user.click(screen.getByRole("button", { name: "Alterar busca" }));
    expect(screen.getByRole("combobox", { name: /Destino/ })).toHaveValue("Rio de Janeiro, RJ");
    expect(screen.getByLabelText(/Check-in/)).toHaveValue(stay().checkIn);
    expect(screen.queryByRole("heading", { name: "Buscas recentes" })).not.toBeInTheDocument();
  });
});

describe("generateMetadata", () => {
  it.each([
    [{}, "Buscar hotéis | Infotera Hotéis"],
    [{ destination: "Bonito, MS" }, "Hotéis em Bonito, MS | Infotera Hotéis"],
    [stay(), "Hotéis em Rio de Janeiro, RJ | Infotera Hotéis"],
  ])("título para %j", async (query, title) => {
    // Sem `alternates`: `/search` só faz sentido com a query.
    expect(await generateMetadata(propsFor(query))).toEqual({ title });
  });
});
