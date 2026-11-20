import { beforeEach, describe, expect, it } from "vitest";
import { LAST_SEARCH_KEY, readLastSearch, rememberSearch } from "./last-search";

const criteria = {
  destination: "Rio de Janeiro, RJ",
  checkIn: "2030-01-10",
  checkOut: "2030-01-13",
  rooms: 1,
  adults: 2,
  children: 0,
} as const;

beforeEach(() => sessionStorage.clear());

describe("last-search", () => {
  it("guarda e lê os critérios", () => {
    rememberSearch(criteria);
    expect(readLastSearch()).toEqual(criteria);
  });

  it("sem nada ou com lixo devolve null", () => {
    expect(readLastSearch()).toBeNull();
    sessionStorage.setItem(`infotera:${LAST_SEARCH_KEY}`, JSON.stringify({ destination: "x" }));
    expect(readLastSearch()).toBeNull();
  });
});
