import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { hotelRoomsQueryOptions } from "@/shared/api/queries";
import { makeRoom, makeSearchCriteria } from "@/shared/testing/fixtures";
import { makeTestQueryClient, renderWithProviders } from "@/shared/testing/render";
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
    const queryClient = makeTestQueryClient();
    queryClient.setQueryData(hotelRoomsQueryOptions(hotel.id).queryKey, seedRooms(hotel.id));
    const breadcrumb = hotelBreadcrumb(hotel, null, "en-US");
    renderWithProviders(
      <>
        <Breadcrumb {...breadcrumb} />
        <HotelHeader locale="en-US" hotel={hotel} stayLabel="Dec 12–15 · 3 nights">
          <p>gallery</p>
        </HotelHeader>
        <SectionNav locale="en-US" />
      </>,
      { queryClient, locale: "en-US" },
    );
    expect(screen.getByRole("navigation", { name: "You are here" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Home" })).toHaveAttribute("href", "/en");
    expect(screen.getByText("Your stay: Dec 12–15 · 3 nights")).toBeInTheDocument();
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
    expect(screen.getByText(`From ${hotel.checkInTime}`)).toBeInTheDocument();
    expect(screen.getByText("This hotel is sold out for these dates")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Hotel not found" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Start a new search" })).toHaveAttribute("href", "/en");
  });

  it("galeria e lightbox em inglês", async () => {
    const user = userEvent.setup();
    const images = ["https://images.unsplash.com/photo-1", "https://images.unsplash.com/photo-2"];
    renderWithProviders(<Gallery name="Hotel X" images={images} />, { locale: "en-US" });
    expect(screen.getByRole("button", { name: "Open photo 1 of 2" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "See all photos (2)" }));
    expect(screen.getByRole("dialog", { name: "Photos of Hotel X" })).toBeInTheDocument();
    expect(screen.getByText("Photo 1 of 2")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Next photo" })).toBeInTheDocument();
  });

  it("quartos em inglês: contagem, botão com o nome do quarto e motivo do bloqueio", () => {
    const queryClient = makeTestQueryClient();
    const rooms = [
      makeRoom({ id: 1, name: "Suite", available: 3, maxGuests: 2 }),
      makeRoom({ id: 2, name: "Studio", available: 0 }),
    ];
    queryClient.setQueryData(hotelRoomsQueryOptions(hotel.id).queryKey, rooms);
    renderWithProviders(
      <StayEditProvider criteriaKey="a">
        <RoomsSection
          hotelId={hotel.id}
          hotelAvailableRooms={5}
          cancellationPolicy="free"
          criteria={makeSearchCriteria()}
          pastDates={false}
        />
      </StayEditProvider>,
      { queryClient, locale: "en-US" },
    );
    expect(screen.getAllByText("2 room types").length).toBeGreaterThan(0);
    expect(screen.getByRole("button", { name: "Select room: Suite" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Sold out: Studio" })).toBeInTheDocument();
    expect(screen.getByText("No rooms available for these dates.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Compare rooms \(2\)/ })).toBeInTheDocument();
  });
});
