import { describe, expect, it } from "vitest";
import { makeSearchCriteria } from "../testing/fixtures";
import { hotelHref, searchHref } from "./links";

const CRITERIA =
  "destination=Rio+de+Janeiro%2C+RJ&checkIn=2026-12-12&checkOut=2026-12-15&rooms=1&adults=2&children=0";

describe("hotelHref", () => {
  it("stay: critérios na ordem da F1", () => {
    expect(
      hotelHref(13, makeSearchCriteria({ checkIn: "2026-12-12", checkOut: "2026-12-15" })),
    ).toBe(`/hotel/13?${CRITERIA}`);
  });

  it("browse: sem critérios", () => {
    expect(hotelHref(13, null)).toBe("/hotel/13");
  });
});

describe("searchHref", () => {
  it("escapa o destino", () => {
    expect(searchHref("São Paulo, SP", null)).toBe("/search?destination=S%C3%A3o+Paulo%2C+SP");
  });
});
