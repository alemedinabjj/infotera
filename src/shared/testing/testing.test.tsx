import { useQueryClient } from "@tanstack/react-query";
import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { makeHotel, makeReview, makeRoom, makeSearchCriteria } from "./fixtures";
import { renderWithProviders } from "./render";

const HotelName = ({ name }: { name: string }) => {
  const client = useQueryClient();
  return <p>{client ? name : "sem client"}</p>;
};

describe("testing helpers", () => {
  it("renderWithProviders oferece QueryClient e makeHotel gera dados válidos", () => {
    const hotel = makeHotel({ name: "Pousada Azul" });
    renderWithProviders(<HotelName name={hotel.name} />);
    expect(screen.getByText("Pousada Azul")).toBeInTheDocument();
  });

  it("fixtures validam overrides pelo schema", () => {
    expect(makeRoom({ available: 0 }).available).toBe(0);
    expect(makeReview().rating).toBe(5);
    expect(makeSearchCriteria({ adults: 3 }).adults).toBe(3);
    expect(() => makeHotel({ rating: 9 })).toThrow();
  });
});
