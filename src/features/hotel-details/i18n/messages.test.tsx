import { act, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { formatClockTime } from "@/shared/lib/clock";
import { makeRoom, makeSearchCriteria } from "@/shared/testing/fixtures";
import { renderWithProviders } from "@/shared/testing/render";
import { seedHotel, seedRooms } from "@/shared/testing/seed";
import { Breadcrumb } from "../components/Breadcrumb";
import { Gallery } from "../components/Gallery";
import { HotelHeader } from "../components/HotelHeader";
import { HotelNotFound } from "../components/HotelNotFound";
import { HotelPolicies } from "../components/HotelPolicies";
import { RoomsSection } from "../components/RoomsSection";
import { SectionNav } from "../components/SectionNav";
import { SoldOutAlert } from "../components/SoldOutAlert";
import { StayEditProvider } from "../components/StayEditContext";
import { hotelBreadcrumb } from "../model/breadcrumb";
import { photoAlt } from "../model/gallery";
import { hotelPageTitle } from "../model/metadata";
import { helpfulLabel, reviewsRangeLabel } from "../model/reviews";
import { buildRoomComparison, comparisonAnnouncement } from "../model/room-comparison";
import { roomCapacityLabel, roomSizeLabel, roomTypesLabel } from "../model/room-labels";
import { selectabilityBadge, selectabilityMessage } from "../model/room-selectability";
import { setStayCriteria } from "../testing/stay-aware";

vi.mock(
  "../components/StayAware",
  async () => (await import("../testing/stay-aware")).stayAwareMock,
);
vi.mock(
  "next/navigation",
  async () => (await import("@/shared/testing/next-navigation")).navigationMock,
);

const hotel = seedHotel(1);

describe("hotel-details por idioma: lógica pura", () => {
  it("rótulos de quarto, título e avaliações em inglês", () => {
    expect(roomCapacityLabel(1, "en-US")).toBe("1 guest");
    expect(roomCapacityLabel(3, "en-US")).toBe("Up to 3 guests");
    expect(roomSizeLabel(32.5, "en-US")).toBe("32.5 m²");
    expect(roomSizeLabel(32.5, "pt-BR")).toBe("32,5 m²");
    expect(roomTypesLabel(2, "en-US")).toBe("2 room types");
    expect(hotelPageTitle({ kind: "not-found" }, "en-US")).toBe(
      "Hotel not found | Infotera Hotéis",
    );
    expect(reviewsRangeLabel(2, 14, 5, "en-US")).toBe("Showing 6–10 of 14 reviews");
    expect(helpfulLabel(1200, "en-US")).toBe("1,200 people found this helpful");
    expect(comparisonAnnouncement(3, 8, "en-US")).toBe("Showing 3 of 8 features");
  });

  it("motivos e selos de bloqueio do quarto em inglês", () => {
    const tooSmall = { kind: "too-small", maxGuests: 2, guestsPerRoom: 3 } as const;
    expect(selectabilityMessage(tooSmall, true, false, "en-US")).toBe(
      "Sleeps up to 2 guests. Your search has 3 per room. Change the guests.",
    );
    expect(selectabilityMessage({ kind: "sold-out" }, true, true, "en-US")).toBe(
      "No rooms available for these dates.",
    );
    expect(selectabilityBadge({ kind: "sold-out" }, "en-US")?.text).toBe("Sold out");
    expect(selectabilityBadge({ kind: "selectable", scarce: 1 }, "en-US")?.text).toBe(
      "Only 1 room left!",
    );
  });

  it("migalhas com links em /en e tabela de comparação em inglês", () => {
    const breadcrumb = hotelBreadcrumb(hotel, makeSearchCriteria(), "en-US");
    expect(breadcrumb.items[0]).toEqual({ label: "Home", href: "/en" });
    expect(breadcrumb.backHref).toMatch(/^\/en\/search\?/);
    const { rows } = buildRoomComparison([makeRoom({ available: 1 })], "en-US");
    expect(rows.find((row) => row.key === "availability")?.cells).toEqual(["1 available"]);
    expect(photoAlt("Hotel X", 1, 5, "en-US")).toBe("Hotel X, photo 2 of 5");
  });
});

describe("hotel-details por idioma: componentes", () => {
  it("cabeçalho, migalhas e navegação em inglês, com o conteúdo da API marcado em pt-BR", () => {
    renderWithProviders(
      <>
        <Breadcrumb
          build={(c) => hotelBreadcrumb(hotel, c, "en-US")}
          criteria={Promise.resolve(null)}
        />
        <HotelHeader locale="en-US" hotel={hotel} rooms={seedRooms(hotel.id)}>
          <p>gallery</p>
        </HotelHeader>
        <SectionNav locale="en-US" />
      </>,
      { locale: "en-US" },
    );
    expect(screen.getByRole("navigation", { name: "You are here" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Home" })).toHaveAttribute("href", "/en");
    expect(screen.getByRole("link", { name: /View rooms/ })).toHaveAttribute("href", "#quartos");
    const nav = screen.getByRole("navigation", { name: "Page sections" });
    expect(within(nav).getByRole("link", { name: "Rooms" })).toBeInTheDocument();
    expect(screen.getByText(hotel.address).closest("[lang]")).toHaveAttribute("lang", "pt-BR");
  });

  it("políticas, esgotado e não encontrado em inglês", () => {
    renderWithProviders(
      <>
        <HotelPolicies hotel={hotel} locale="en-US" />
        <SoldOutAlert hasDates locale="en-US" />
        <HotelNotFound locale="en-US" />
      </>,
      { locale: "en-US" },
    );
    expect(screen.getByText("Check-in")).toBeInTheDocument();
    expect(
      screen.getByText(`From ${formatClockTime(hotel.checkInTime, "en-US")}`),
    ).toBeInTheDocument();
    expect(screen.getByText("This hotel is sold out for these dates")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Hotel not found" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Start a new search" })).toHaveAttribute("href", "/en");
  });

  it("galeria em inglês: links para a rota da foto sob /en", () => {
    const images = ["https://images.unsplash.com/photo-1", "https://images.unsplash.com/photo-2"];
    renderWithProviders(<Gallery locale="en-US" hotelId={1} images={images} />, {
      locale: "en-US",
    });
    expect(screen.getByRole("link", { name: "Open photo 1 of 2" })).toHaveAttribute(
      "href",
      "/en/hotel/1/photos/1",
    );
    expect(screen.getByRole("link", { name: "See all photos (2)" })).toBeInTheDocument();
  });

  it("quartos em inglês: contagem, botão com o nome do quarto e motivo do bloqueio", async () => {
    const rooms = [
      makeRoom({ id: 1, name: "Suite", available: 3, maxGuests: 2 }),
      makeRoom({ id: 2, name: "Studio", available: 0 }),
    ];
    setStayCriteria(makeSearchCriteria());
    await act(async () => {
      renderWithProviders(
        <StayEditProvider>
          <RoomsSection
            locale="en-US"
            hotelId={hotel.id}
            rooms={rooms}
            hotelAvailableRooms={5}
            cancellationPolicy="free"
            criteria={Promise.resolve(makeSearchCriteria())}
          />
        </StayEditProvider>,
        { locale: "en-US" },
      );
    });
    expect(screen.getAllByText("2 room types").length).toBeGreaterThan(0);
    expect(screen.getByRole("button", { name: "Select room: Suite" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Sold out: Studio" })).toBeInTheDocument();
    expect(screen.getByText("No rooms available for these dates.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Compare rooms \(2\)/ })).toBeInTheDocument();
  });
});
