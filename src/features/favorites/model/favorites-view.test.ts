import { describe, expect, it } from "vitest";
import { makeHotel } from "@/shared/testing/fixtures";
import { deriveFavoritesView, orderBySnapshot } from "./favorites-view";

describe("deriveFavoritesView", () => {
  it.each([
    [{ hydrated: false, count: 0, status: "pending", fetchStatus: "idle" }, "hydrating"],
    [{ hydrated: false, count: 3, status: "success", fetchStatus: "idle" }, "hydrating"],
    [{ hydrated: true, count: 0, status: "pending", fetchStatus: "idle" }, "empty"],
    [{ hydrated: true, count: 3, status: "pending", fetchStatus: "fetching" }, "loading"],
    [{ hydrated: true, count: 3, status: "pending", fetchStatus: "paused" }, "offline"],
    [{ hydrated: true, count: 3, status: "error", fetchStatus: "idle" }, "error"],
    [{ hydrated: true, count: 3, status: "success", fetchStatus: "idle" }, "success"],
  ] as const)("%j -> %s", (input, expected) => {
    expect(deriveFavoritesView(input)).toBe(expected);
  });
});

describe("orderBySnapshot", () => {
  it("segue a ordem do snapshot e descarta ids sem hotel", () => {
    const hotels = [makeHotel({ id: 1 }), makeHotel({ id: 4 }), makeHotel({ id: 7 })];
    expect(orderBySnapshot(hotels, [7, 999, 1]).map((hotel) => hotel.id)).toEqual([7, 1]);
  });
});
