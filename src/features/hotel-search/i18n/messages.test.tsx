import { screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { makeHotel, makeSearchCriteria } from "@/shared/testing/fixtures";
import { renderWithProviders } from "@/shared/testing/render";
import { HotelCard } from "../components/HotelCard";
import { formatDistanceFromCenter } from "../model/distance";
import { sortLabel } from "../model/labels";
import { describePriceSummary } from "../model/price-range";
import { describeResultCount, describeToolbar } from "../model/results-view";
import { searchPageTitle } from "../model/search-page";

vi.mock(
  "next/navigation",
  async () => (await import("@/shared/testing/next-navigation")).navigationMock,
);

describe("busca por idioma", () => {
  it("contagens, status e rótulos em inglês", () => {
    expect(describeResultCount(14, "en-US")).toBe("14 hotels found");
    expect(describeResultCount(14)).toBe("14 hotéis encontrados");
    const { status } = describeToolbar({
      view: { kind: "results", stale: false, offlineWithData: false },
      slow: false,
      total: 14,
      listing: { mode: "pages", page: 2 },
      locale: "en-US",
    });
    expect(status).toEqual({ kind: "text", text: "Showing 11–14 of 14" });
    expect(sortLabel("price-asc", "en-US")).toBe("Lowest price");
  });

  it("distância, faixa de preço e título", () => {
    expect(formatDistanceFromCenter(2.3, "en-US")).toBe("2.3 km from the center point");
    expect(formatDistanceFromCenter(2.3)).toBe("a 2,3 km do ponto central");
    expect(describePriceSummary({ min: 200, max: 3000 }, "en-US")).toBe("From R$200");
    expect(searchPageTitle({ kind: "browse", destination: "Rio" }, "en-US")).toBe(
      "Hotels in Rio | Infotera Hotéis",
    );
  });

  it("o card em inglês: preço, link localizado e distância", () => {
    renderWithProviders(
      <HotelCard
        hotel={makeHotel({ id: 5, name: "Hotel Cinco", pricePerNight: 1200 })}
        criteria={makeSearchCriteria()}
        selectedAmenities={[]}
        center={null}
      />,
      { locale: "en-US" },
    );
    expect(screen.getByRole("link", { name: /Hotel Cinco/ }).getAttribute("href")).toMatch(
      /^\/en\/hotel\/5\?/,
    );
    expect(screen.getByText(/total with fees/)).toBeInTheDocument();
    expect(screen.getByText(/before fees/)).toBeInTheDocument();
  });
});
