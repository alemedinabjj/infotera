import { describe, expect, it } from "vitest";
import { makeHotel, makeSearchCriteria } from "@/shared/testing/fixtures";
import { hotelBreadcrumb } from "./breadcrumb";

const hotel = makeHotel();

describe("hotelBreadcrumb", () => {
  it("com critérios, o nível do meio leva a /search com os mesmos critérios", () => {
    const criteria = makeSearchCriteria({ checkIn: "2026-12-12", checkOut: "2026-12-15" });
    const crumb = hotelBreadcrumb(hotel, criteria, "pt-BR");
    expect(crumb.items).toEqual([
      { label: "Início", href: "/" },
      {
        label: "Hotéis em Rio de Janeiro, RJ",
        href: "/search?destination=Rio+de+Janeiro%2C+RJ&checkIn=2026-12-12&checkOut=2026-12-15&rooms=1&adults=2&children=0",
      },
      { label: "Hotel Copacabana Palace", href: null },
    ]);
    expect(crumb.backHref).toBe(crumb.items[1]?.href);
    expect(crumb.backLabel).toBe("Hotéis em Rio de Janeiro, RJ");
  });

  it("sem critérios, leva a /search só com o destino", () => {
    const crumb = hotelBreadcrumb(hotel, null, "pt-BR");
    expect(crumb.backHref).toBe("/search?destination=Rio+de+Janeiro%2C+RJ");
  });
});
