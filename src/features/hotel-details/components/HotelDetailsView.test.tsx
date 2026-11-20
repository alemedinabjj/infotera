import { screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { makeReview } from "@/shared/testing/fixtures";
import { renderWithProviders } from "@/shared/testing/render";
import { seedHotel, seedRooms } from "@/shared/testing/seed";
import { setStayCriteria } from "../testing/stay-aware";
import { HotelDetailsView } from "./HotelDetailsView";

vi.mock("next/navigation", async () => ({
  ...(await import("@/shared/testing/next-navigation")).navigationMock,
  notFound: () => {
    throw Object.assign(new Error("NEXT_HTTP_ERROR_FALLBACK;404"), {
      digest: "NEXT_HTTP_ERROR_FALLBACK;404",
    });
  },
}));
// Os RSC assíncronos (similares, barra da estadia, links) têm teste próprio.
vi.mock("./SimilarHotels", () => ({ SimilarHotels: () => <p>similares</p> }));
vi.mock("./HotelStayBar", () => ({ HotelStayBar: () => <p>barra da estadia</p> }));
vi.mock("./StayAware", async () => (await import("../testing/stay-aware")).stayAwareMock);

const snapshots = vi.hoisted(() => ({
  hotel: vi.fn(),
  rooms: vi.fn(),
  reviews: vi.fn(),
}));
vi.mock("../api/catalog.cached", () => ({
  getHotelSnapshot: snapshots.hotel,
  getHotelRoomsSnapshot: snapshots.rooms,
  getFirstReviewsSnapshot: snapshots.reviews,
}));

const stubSnapshots = (availableRooms = seedHotel(1).availableRooms) => {
  snapshots.hotel.mockResolvedValue({ kind: "found", hotel: { ...seedHotel(1), availableRooms } });
  snapshots.rooms.mockResolvedValue(seedRooms(1));
  snapshots.reviews.mockResolvedValue({
    page: { items: [makeReview({ title: "Ótima estadia" })], total: 1 },
    fetchedAt: 1,
  });
};

const view = (hotelId = 1) =>
  HotelDetailsView({
    locale: "pt-BR",
    hotelId,
    criteria: Promise.resolve(null),
    renderDatesForm: () => <p>formulário de datas</p>,
  });

beforeEach(() => {
  Object.values(snapshots).forEach((mock) => {
    mock.mockReset();
  });
  setStayCriteria(null);
});
afterEach(() => vi.restoreAllMocks());

describe("HotelDetailsView: catálogo em paralelo", () => {
  it("hotel, quartos e a 1ª página de avaliações saem juntos, antes de qualquer um resolver", async () => {
    snapshots.hotel.mockReturnValue(new Promise(() => undefined));
    snapshots.rooms.mockReturnValue(new Promise(() => undefined));
    snapshots.reviews.mockReturnValue(new Promise(() => undefined));
    void view(7);
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(snapshots.hotel).toHaveBeenCalledWith(7);
    expect(snapshots.rooms).toHaveBeenCalledWith(7);
    expect(snapshots.reviews).toHaveBeenCalledWith(7);
  });

  it("hotel not-found vira notFound()", async () => {
    snapshots.hotel.mockResolvedValue({ kind: "not-found" });
    snapshots.rooms.mockResolvedValue([]);
    snapshots.reviews.mockResolvedValue({ page: { items: [], total: 0 }, fetchedAt: 1 });
    await expect(view(999)).rejects.toMatchObject({ digest: expect.stringContaining("404") });
  });

  it("erro do catálogo é relançado (error.tsx da rota)", async () => {
    snapshots.hotel.mockRejectedValue(Object.assign(new Error("boom"), { status: 500 }));
    snapshots.rooms.mockResolvedValue([]);
    snapshots.reviews.mockResolvedValue({ page: { items: [], total: 0 }, fetchedAt: 1 });
    await expect(view()).rejects.toMatchObject({ status: 500 });
  });
});

describe("HotelDetailsView: composição", () => {
  const renderView = async (availableRooms?: number) => {
    stubSnapshots(availableRooms);
    return renderWithProviders(await view());
  };

  it("um h1, sem <main>, e as 6 seções na ordem da página", async () => {
    const { container } = await renderView();
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Hotel Copacabana Palace");
    expect(container.querySelector("main")).toBeNull();
    const ids = [...container.querySelectorAll("section[id]")].map((section) => section.id);
    expect(ids).toEqual([
      "visao-geral",
      "quartos",
      "localizacao",
      "politicas",
      "avaliacoes",
      "similares",
    ]);
    const h2 = screen.getAllByRole("heading", { level: 2 }).map((heading) => heading.textContent);
    expect(h2[1]).toBe("Quartos");
  });

  it("o que é do hotel e do quarto já está na casca: nome, diárias, a partir de e comentários", async () => {
    const { container } = await renderView();
    expect(container).toHaveTextContent("a partir de R$ 800 por noite");
    expect(container).toHaveTextContent("Suíte Deluxe Ocean View");
    expect(container).toHaveTextContent("R$ 1.200 por noite, sem taxas");
    expect(container).toHaveTextContent("Ótima estadia");
  });

  it("a barra da estadia ocupa o lugar entre o título e a lista de quartos", async () => {
    await renderView();
    const bar = screen.getByText("barra da estadia");
    const rooms = screen.getByRole("heading", { level: 3, name: "Suíte Deluxe Ocean View" });
    expect(
      bar.compareDocumentPosition(rooms as Node) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  it("hotel esgotado: o aviso vem antes da barra da estadia", async () => {
    await renderView(0);
    const alert = screen.getByText("Este hotel está sem quartos disponíveis no momento");
    const bar = screen.getByText("barra da estadia");
    expect(alert.compareDocumentPosition(bar) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });
});
