import { QueryClient } from "@tanstack/react-query";
import { fireEvent, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { makeHotel, makeRoom, makeSearchCriteria } from "@/shared/testing/fixtures";
import { renderWithProviders } from "@/shared/testing/render";
import { HotelCard } from "./HotelCard";
import { HotelCardSkeleton } from "./HotelCardSkeleton";

vi.mock(
  "next/navigation",
  async () => (await import("@/shared/testing/next-navigation")).navigationMock,
);

const criteria = makeSearchCriteria({ checkIn: "2026-12-12", checkOut: "2026-12-15", rooms: 1 });

const cardClient = () =>
  new QueryClient({ defaultOptions: { queries: { staleTime: 60_000, retry: false } } });

const renderCard = (props: Partial<Parameters<typeof HotelCard>[0]> = {}, client = cardClient()) =>
  renderWithProviders(
    <ul>
      <li>
        <HotelCard
          hotel={makeHotel({
            id: 13,
            name: "Pousada Vista Corcovado",
            pricePerNight: 180,
            availableRooms: 9,
          })}
          criteria={criteria}
          selectedAmenities={[]}
          center={null}
          {...props}
        />
      </li>
    </ul>,
    { queryClient: client },
  );

describe("HotelCard: distância do centro", () => {
  const center = { latitude: -22.9683, longitude: -43.1792 };

  it("mostra a distância abaixo de tipo e destino, com ícone decorativo", () => {
    const { container } = renderCard({
      hotel: makeHotel({ latitude: center.latitude, longitude: center.longitude + 0.0225 }),
      center,
    });
    expect(screen.getByText("a 2,3 km do ponto central")).toBeInTheDocument();
    expect(container.querySelector("article svg[aria-hidden='true']")).not.toBeNull();
  });

  it("formata distâncias curtas em metros", () => {
    renderCard({
      hotel: makeHotel({ latitude: center.latitude, longitude: center.longitude + 0.0049 }),
      center,
    });
    expect(screen.getByText("a 500 m do ponto central")).toBeInTheDocument();
  });

  it("sem centro não há linha de distância", () => {
    renderCard();
    expect(screen.queryByText(/do ponto central/)).not.toBeInTheDocument();
  });
});

describe("HotelCard: conteúdo (critérios 2 a 5)", () => {
  it("mostra foto, único link, tipo e destino, nota e preço por noite", () => {
    renderCard();
    expect(screen.getByRole("img", { name: "Pousada Vista Corcovado" })).toBeInTheDocument();
    const links = screen.getAllByRole("link");
    expect(links).toHaveLength(1);
    expect(links[0]).toHaveAccessibleName("Pousada Vista Corcovado");
    expect(screen.getByRole("heading", { level: 3 })).toContainElement(links[0] ?? null);
    expect(screen.getByText("Hotel · Rio de Janeiro, RJ")).toBeInTheDocument();
    expect(screen.getByText("4,8")).toBeInTheDocument();
    expect(screen.getByText("Excelente")).toBeInTheDocument();
    expect(screen.getByText(/2\.847 avaliações/)).toBeInTheDocument();
  });

  it("modo stay: total, rótulo e diária secundária", () => {
    renderCard();
    expect(screen.getByText("R$ 540,00")).toBeInTheDocument();
    expect(screen.getByText("total · 3 noites · 1 quarto")).toBeInTheDocument();
    expect(screen.getByText(/a partir de/)).toHaveTextContent("a partir de R$ 180 por noite");
  });

  it("2 quartos: total dobra", () => {
    renderCard({ criteria: { ...criteria, rooms: 2 } });
    expect(screen.getByText("R$ 1.080,00")).toBeInTheDocument();
    expect(screen.getByText("total · 3 noites · 2 quartos")).toBeInTheDocument();
  });

  it("browse: diária como número grande, sem total e link sem critérios", () => {
    renderCard({ criteria: null });
    expect(screen.getByText("R$ 180")).toBeInTheDocument();
    expect(screen.getByText("por noite")).toBeInTheDocument();
    expect(screen.queryByText(/total ·/)).not.toBeInTheDocument();
    expect(screen.getByRole("link")).toHaveAttribute("href", "/hotel/13");
  });

  it("link do card leva os critérios na ordem da F1, sem filtros", () => {
    renderCard();
    expect(screen.getByRole("link")).toHaveAttribute(
      "href",
      "/hotel/13?destination=Rio+de+Janeiro%2C+RJ&checkIn=2026-12-12&checkOut=2026-12-15&rooms=1&adults=2&children=0",
    );
  });

  it("até 3 comodidades, as filtradas primeiro, mais +N", () => {
    renderCard({
      hotel: makeHotel({
        id: 13,
        availableRooms: 9,
        amenities: ["wifi", "pool", "spa", "gym", "bar"],
      }),
      selectedAmenities: ["bar"],
    });
    const items = screen.getAllByRole("listitem").filter((item) => item.closest("ul ul"));
    expect(items.map((item) => item.textContent)).toEqual([
      "Bar",
      "Wi-Fi",
      "Piscina",
      "+22 comodidades a mais",
    ]);
  });

  it("uma comodidade a mais usa o singular", () => {
    renderCard({
      hotel: makeHotel({ id: 13, availableRooms: 9, amenities: ["wifi", "pool", "spa", "gym"] }),
    });
    expect(screen.getByText("1 comodidade a mais")).toBeInTheDocument();
  });

  it("esgotado: selo, nota, sem total e foto em cinza (critério 4)", () => {
    renderCard({ hotel: makeHotel({ id: 19, availableRooms: 0, pricePerNight: 250 }) });
    expect(screen.getByText("Esgotado")).toBeInTheDocument();
    expect(screen.getByText("Sem quartos disponíveis para estas datas.")).toBeInTheDocument();
    expect(screen.queryByText(/total ·/)).not.toBeInTheDocument();
    expect(screen.getByRole("img")).toHaveClass("grayscale");
    expect(screen.getByRole("link")).toBeInTheDocument();
  });

  it("escassez: Apenas 1 quarto! mantém o total", () => {
    renderCard({ hotel: makeHotel({ id: 7, availableRooms: 1, pricePerNight: 100 }) });
    expect(screen.getByText("Apenas 1 quarto!")).toBeInTheDocument();
    expect(screen.getByText("R$ 300,00")).toBeInTheDocument();
  });

  it("insuficiente: busca de 3 quartos com 2 disponíveis", () => {
    renderCard({
      hotel: makeHotel({ availableRooms: 2 }),
      criteria: { ...criteria, rooms: 3, adults: 3 },
    });
    expect(screen.getByText("Só 2 quartos disponíveis")).toBeInTheDocument();
    expect(screen.getByText("Sua busca pede 3 quartos.")).toBeInTheDocument();
    expect(screen.queryByText(/total ·/)).not.toBeInTheDocument();
  });

  it("sem avaliações", () => {
    renderCard({ hotel: makeHotel({ reviewCount: 0, rating: 0, availableRooms: 9 }) });
    expect(screen.getByText("Sem avaliações")).toBeInTheDocument();
  });

  it("imagem quebrada vira bloco com ícone, sem img", () => {
    renderCard();
    fireEvent.error(screen.getByRole("img", { name: "Pousada Vista Corcovado" }));
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
  });
});

describe("HotelCard: prefetch com intenção (critério 6)", () => {
  const fetchMock = vi.fn(
    async (url: string) =>
      new Response(
        JSON.stringify(
          url.includes("/rooms") ? [makeRoom({ hotelId: 13 })] : makeHotel({ id: 13 }),
        ),
      ),
  );

  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    fetchMock.mockClear();
  });

  const urls = () => fetchMock.mock.calls.map(([url]) => url);

  it("mouse parado por 150 ms prefetcha hotel e quartos uma vez, sem repetir", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    renderCard();
    const link = screen.getByRole("link");
    await user.hover(link);
    expect(urls()).toEqual([]);
    await vi.advanceTimersByTimeAsync(160);
    expect(urls().sort()).toEqual([
      "http://api.test/hotels/13",
      "http://api.test/rooms?hotelId=13",
    ]);
    await user.unhover(link);
    await user.hover(link);
    await vi.advanceTimersByTimeAsync(200);
    expect(urls()).toHaveLength(2);
  });

  it("passar rápido por cima não dispara", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    renderCard();
    const link = screen.getByRole("link");
    await user.hover(link);
    await vi.advanceTimersByTimeAsync(80);
    await user.unhover(link);
    await vi.advanceTimersByTimeAsync(300);
    expect(urls()).toEqual([]);
  });

  it("foco no link prefetcha na hora", async () => {
    renderCard();
    screen.getByRole("link").focus();
    await vi.advanceTimersByTimeAsync(0);
    expect(urls()).toHaveLength(2);
  });
});

describe("HotelCardSkeleton", () => {
  it("é um item de lista sem link e escondido das tecnologias assistivas", () => {
    renderWithProviders(
      <ul>
        <HotelCardSkeleton />
      </ul>,
    );
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
    expect(screen.getAllByRole("listitem")).toHaveLength(1);
  });
});

describe("HotelCard: favoritar e comparar (critério 2)", () => {
  it("ordem de Tab: nome, coração, Comparar; coração com nome acessível e aria-pressed", async () => {
    const user = userEvent.setup();
    renderCard();
    await user.tab();
    expect(screen.getByRole("link", { name: "Pousada Vista Corcovado" })).toHaveFocus();
    await user.tab();
    const heart = screen.getByRole("button", {
      name: "Salvar nos favoritos: Pousada Vista Corcovado",
    });
    expect(heart).toHaveFocus();
    expect(heart).toHaveAttribute("aria-pressed", "false");
    await user.tab();
    expect(
      screen.getByRole("checkbox", { name: "Comparar: Pousada Vista Corcovado" }),
    ).toHaveFocus();
  });

  it("os controles ficam fora do link e acima do ::after (relative z-10 / z-10)", () => {
    renderCard();
    const heart = screen.getByRole("button", { name: /Salvar nos favoritos/ });
    expect(heart.closest("a")).toBeNull();
    expect(heart.parentElement).toHaveClass("z-10");
    expect(screen.getByRole("checkbox").closest("div")).toHaveClass("relative", "z-10", "min-h-11");
  });

  it("o skeleton ganha a linha do Comparar", () => {
    const { container } = renderWithProviders(<HotelCardSkeleton />);
    expect(container.querySelector(".min-h-11")).not.toBeNull();
  });
});
