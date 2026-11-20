import { act, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { hotelRoomsQueryOptions } from "@/shared/api/queries";
import { makeHotel, makeRoom, makeSearchCriteria } from "@/shared/testing/fixtures";
import { makeTestQueryClient, renderWithProviders } from "@/shared/testing/render";
import { seedHotel, seedRooms } from "@/shared/testing/seed";
import { Toaster } from "@/shared/ui";
import { hotelBreadcrumb } from "../model/breadcrumb";
import { Breadcrumb } from "./Breadcrumb";
import { HotelHeader } from "./HotelHeader";
import { SectionNav } from "./SectionNav";

vi.mock(
  "next/navigation",
  async () => (await import("@/shared/testing/next-navigation")).navigationMock,
);

const renderHeader = (
  hotelId: number,
  rooms = seedRooms(hotelId),
  stayLabel: string | null = null,
) => {
  const queryClient = makeTestQueryClient();
  queryClient.setQueryData(hotelRoomsQueryOptions(hotelId).queryKey, rooms);
  return renderWithProviders(
    <HotelHeader hotel={seedHotel(hotelId)} stayLabel={stayLabel}>
      <p>galeria</p>
    </HotelHeader>,
    { queryClient },
  );
};

afterEach(() => vi.unstubAllGlobals());

describe("HotelHeader (critério 7)", () => {
  it("h1, tipo, destino, endereço, nota e 'a partir de' pelos quartos", async () => {
    const { container } = renderHeader(1);
    expect(
      screen.getByRole("heading", { level: 1, name: "Hotel Copacabana Palace" }),
    ).toBeVisible();
    expect(container).toHaveTextContent("Hotel · Rio de Janeiro, RJ");
    expect(container).toHaveTextContent(seedHotel(1).address);
    expect(container).toHaveTextContent("Nota 4,8 de 5,Excelente·2.847 avaliações");
    expect(container).toHaveTextContent("a partir de R$ 800 por noite");
    expect(screen.getByRole("link", { name: "Ver quartos" })).toHaveAttribute("href", "#quartos");
    expect(screen.getByRole("button", { name: "Copiar link" })).toBeVisible();
  });

  it("hotel 4: R$ 720 (o hotel diz 890)", () => {
    const { container } = renderHeader(4);
    expect(container).toHaveTextContent("a partir de R$ 720 por noite");
  });

  it("o resumo da estadia só aparece com critérios", () => {
    const { container, unmount } = renderHeader(1);
    expect(container).not.toHaveTextContent("Sua estadia");
    unmount();
    const withStay = renderHeader(1, seedRooms(1), "12–15 dez · 3 noites · 2 adultos · 1 quarto");
    expect(withStay.container).toHaveTextContent(
      "Sua estadia: 12–15 dez · 3 noites · 2 adultos · 1 quarto",
    );
  });

  it("destaque vira badge", () => {
    const hotel = makeHotel({ featured: true });
    renderWithProviders(
      <HotelHeader hotel={hotel} stayLabel={null}>
        <p>galeria</p>
      </HotelHeader>,
    );
    expect(screen.getByText("Destaque")).toBeInTheDocument();
  });

  it("todos os quartos esgotados: menor diária com selo Esgotado", () => {
    const { container } = renderHeader(19);
    expect(container).toHaveTextContent("a partir de");
    expect(screen.getByText("Esgotado")).toBeInTheDocument();
  });

  it("sem quartos: aviso no lugar do preço", () => {
    const { container } = renderHeader(1, []);
    expect(container).toHaveTextContent("Sem quartos para reserva no momento.");
  });

  it("enquanto os quartos carregam: skeleton, sem texto de preço", () => {
    vi.stubGlobal("fetch", () => new Promise<Response>(() => undefined));
    const { container } = renderWithProviders(
      <HotelHeader hotel={makeHotel()} stayLabel={null}>
        <p>galeria</p>
      </HotelHeader>,
    );
    expect(container).not.toHaveTextContent("a partir de");
    expect(container.querySelector("[aria-hidden='true'].animate-pulse")).toBeInTheDocument();
  });

  it("quartos com erro: texto discreto; a página segue", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("{}", { status: 500 })),
    );
    const { container } = renderWithProviders(
      <HotelHeader hotel={makeHotel()} stayLabel={null}>
        <p>galeria</p>
      </HotelHeader>,
    );
    expect(await screen.findByText("Preços indisponíveis no momento.")).toBeInTheDocument();
    expect(container).toHaveTextContent("Hotel Copacabana Palace");
  });

  it("quando o retry da seção Quartos dá certo, o preço entra no lugar", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("{}", { status: 500 })),
    );
    const { queryClient, container } = renderWithProviders(
      <HotelHeader hotel={makeHotel()} stayLabel={null}>
        <p>galeria</p>
      </HotelHeader>,
    );
    await screen.findByText("Preços indisponíveis no momento.");
    act(() =>
      queryClient.setQueryData(hotelRoomsQueryOptions(1).queryKey, [
        makeRoom({ pricePerNight: 650 }),
      ]),
    );
    expect(await screen.findByText("R$ 650")).toBeInTheDocument();
    expect(container).not.toHaveTextContent("Preços indisponíveis");
  });
});

describe("Copiar link (critério 8)", () => {
  it("copia a URL atual e mostra o toast", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal("navigator", { clipboard: { writeText } });
    render(<Toaster />);
    renderHeader(1);
    await userEvent.click(screen.getByRole("button", { name: "Copiar link" }));
    expect(writeText).toHaveBeenCalledWith(window.location.href);
    expect(await screen.findByText("Link copiado.")).toBeInTheDocument();
  });

  it("falha mostra a mensagem de erro", async () => {
    vi.stubGlobal("navigator", {
      clipboard: { writeText: vi.fn().mockRejectedValue(new Error("negado")) },
    });
    render(<Toaster />);
    renderHeader(1);
    await userEvent.click(screen.getByRole("button", { name: "Copiar link" }));
    expect(
      await screen.findByText("Não foi possível copiar. Copie o endereço na barra do navegador."),
    ).toBeInTheDocument();
  });
});

describe("Breadcrumb e SectionNav (critérios 6 e 11)", () => {
  it("itens, link do meio com critérios e último com aria-current", () => {
    const criteria = makeSearchCriteria({ checkIn: "2026-12-12", checkOut: "2026-12-15" });
    const crumb = hotelBreadcrumb(makeHotel(), criteria);
    render(<Breadcrumb {...crumb} />);
    const nav = screen.getByRole("navigation", { name: "Você está aqui" });
    const list = within(nav).getByRole("list");
    expect(within(list).getByRole("link", { name: "Início" })).toHaveAttribute("href", "/");
    expect(
      within(list).getByRole("link", { name: "Hotéis em Rio de Janeiro, RJ" }),
    ).toHaveAttribute(
      "href",
      expect.stringContaining("/search?destination=Rio+de+Janeiro%2C+RJ&checkIn=2026-12-12"),
    );
    expect(within(list).getByText("Hotel Copacabana Palace")).toHaveAttribute(
      "aria-current",
      "page",
    );
  });

  it("sem critérios o link vai só com o destino", () => {
    render(<Breadcrumb {...hotelBreadcrumb(makeHotel(), null)} />);
    expect(
      screen.getAllByRole("link", { name: /Hotéis em Rio de Janeiro, RJ/ })[0],
    ).toHaveAttribute("href", "/search?destination=Rio+de+Janeiro%2C+RJ");
  });

  it("a barra de seções tem âncora para cada seção, na ordem da página", () => {
    render(<SectionNav />);
    const nav = screen.getByRole("navigation", { name: "Seções da página" });
    const links = within(nav).getAllByRole("link");
    expect(links.map((link) => link.textContent)).toEqual([
      "Visão geral",
      "Quartos",
      "Localização",
      "Políticas",
      "Avaliações",
      "Similares",
    ]);
    expect(links.map((link) => link.getAttribute("href"))).toEqual([
      "#visao-geral",
      "#quartos",
      "#localizacao",
      "#politicas",
      "#avaliacoes",
      "#similares",
    ]);
  });
});

describe("HotelHeader: favoritar e comparar (critério 5)", () => {
  it("coração ao lado do h1 e Comparar na linha de ações, antes do Copiar link", async () => {
    const user = userEvent.setup();
    renderHeader(1);
    const heading = screen.getByRole("heading", { level: 1 });
    expect(heading.parentElement).toContainElement(
      screen.getByRole("button", { name: "Salvar nos favoritos: Hotel Copacabana Palace" }),
    );
    await user.tab();
    expect(screen.getByRole("button", { name: /Salvar nos favoritos/ })).toHaveFocus();
    await user.tab();
    expect(
      screen.getByRole("checkbox", { name: "Comparar: Hotel Copacabana Palace" }),
    ).toHaveFocus();
    await user.tab();
    expect(screen.getByRole("button", { name: /Copiar link/ })).toHaveFocus();
    await user.tab();
    expect(screen.getByRole("link", { name: "Ver quartos" })).toHaveFocus();
  });
});
