import { render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { makeHotel, makeSearchCriteria } from "@/shared/testing/fixtures";
import { SimilarHotels } from "./SimilarHotels";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

const criteria = makeSearchCriteria({ checkIn: "2026-12-12", checkOut: "2026-12-15" });
const props: Parameters<typeof SimilarHotels>[0] = {
  locale: "pt-BR",
  hotelId: 1,
  destination: "Rio de Janeiro, RJ",
  criteria,
};

const renderSimilar = async (overrides: Partial<typeof props> = {}) =>
  render(await SimilarHotels({ ...props, ...overrides }));

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("SimilarHotels (critérios 32–33)", () => {
  it("cards com foto, nome como único link (com os critérios), tipo, nota, diária e badge", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        json([
          makeHotel({
            id: 17,
            name: "Hotel Fasano",
            rating: 4.9,
            availableRooms: 8,
            pricePerNight: 1500,
          }),
          makeHotel({ id: 7, name: "Pousada Sol", propertyType: "pousada", availableRooms: 1 }),
          makeHotel({ id: 2, name: "Resort Lua", propertyType: "resort", availableRooms: 0 }),
        ]),
      ),
    );
    await renderSimilar();
    const cards = screen.getAllByRole("article");
    expect(cards).toHaveLength(3);
    const first = cards[0] as HTMLElement;
    const link = within(first).getByRole("link", { name: "Hotel Fasano" });
    expect(within(first).getAllByRole("link")).toHaveLength(1);
    expect(link).toHaveAttribute(
      "href",
      expect.stringMatching(/^\/hotel\/17\?destination=Rio\+de\+Janeiro%2C\+RJ&checkIn=2026-12-12/),
    );
    expect(first).toHaveTextContent("Hotel");
    expect(first).toHaveTextContent("4,9");
    expect(first).toHaveTextContent("a partir de R$ 1.500 por noite");
    expect(first.querySelector("img")).toHaveAttribute("alt", "");
    expect(first).not.toHaveTextContent("Excelente");
    expect(cards[1]).toHaveTextContent("Apenas 1 quarto!");
    expect(cards[2]).toHaveTextContent("Esgotado");
  });

  it("um único similar (hotel 59 → 60)", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => json([makeHotel({ id: 60, name: "Pousada Jeri" })])),
    );
    await renderSimilar({ hotelId: 59, destination: "Jericoacoara, CE" });
    expect(screen.getAllByRole("article")).toHaveLength(1);
  });

  it("sem critérios o link do card não leva datas", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => json([makeHotel({ id: 17, name: "Hotel Fasano" })])),
    );
    await renderSimilar({ criteria: null });
    expect(screen.getByRole("link", { name: "Hotel Fasano" })).toHaveAttribute("href", "/hotel/17");
  });

  it("vazio: texto e link para nova busca", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => json([])),
    );
    await renderSimilar();
    expect(screen.getByText("Nenhum outro hotel em Rio de Janeiro, RJ.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Fazer nova busca" })).toHaveAttribute("href", "/");
  });

  it("falha: texto fixo + link para a lista do destino (com critérios) e console.error estruturado", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => undefined);
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => json({ error: "Falha simulada" }, 500)),
    );
    await renderSimilar();
    expect(screen.getByText("Não foi possível carregar hotéis similares.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Ver hotéis em Rio de Janeiro, RJ" })).toHaveAttribute(
      "href",
      expect.stringContaining("/search?destination=Rio+de+Janeiro%2C+RJ&checkIn=2026-12-12"),
    );
    expect(document.body).not.toHaveTextContent("Falha simulada");
    expect(error).toHaveBeenCalledWith("[hotel-details] similar hotels failed", {
      hotelId: 1,
      kind: "http",
      status: 500,
    });
  });
});
