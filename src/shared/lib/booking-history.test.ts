import { beforeEach, describe, expect, it } from "vitest";
import {
  addBookingToHistory,
  BOOKING_HISTORY_KEY,
  BOOKING_HISTORY_LIMIT,
  type BookingHistoryEntry,
  readBookingHistory,
  recordBooking,
  removeFromHistory,
} from "./booking-history";

const RAW_KEY = `infotera:${BOOKING_HISTORY_KEY}`;
const uuid = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const at = (minutes: number) => new Date(Date.UTC(2026, 10, 19, 12, minutes));

beforeEach(() => localStorage.clear());

describe("addBookingToHistory", () => {
  it("adiciona no topo", () => {
    const first = addBookingToHistory([], uuid(1), at(0));
    const second = addBookingToHistory(first, uuid(2), at(1));
    expect(second.map((item) => item.id)).toEqual([uuid(2), uuid(1)]);
    expect(second[0]?.savedAt).toBe(at(1).toISOString());
  });

  it("dedupe: o id repetido sobe para o topo, uma vez só", () => {
    let list: BookingHistoryEntry[] = [];
    list = addBookingToHistory(list, uuid(1), at(0));
    list = addBookingToHistory(list, uuid(2), at(1));
    list = addBookingToHistory(list, uuid(1), at(2));
    expect(list.map((item) => item.id)).toEqual([uuid(1), uuid(2)]);
    expect(list[0]?.savedAt).toBe(at(2).toISOString());
  });

  it("mantém no máximo 10 e o mais antigo sai", () => {
    let list: BookingHistoryEntry[] = [];
    for (let n = 1; n <= BOOKING_HISTORY_LIMIT + 1; n += 1) {
      list = addBookingToHistory(list, uuid(n), at(n));
    }
    expect(list).toHaveLength(BOOKING_HISTORY_LIMIT);
    expect(list.at(-1)?.id).toBe(uuid(2));
    expect(list[0]?.id).toBe(uuid(BOOKING_HISTORY_LIMIT + 1));
  });
});

describe("recordBooking / readBookingHistory", () => {
  it("grava só id e savedAt", () => {
    recordBooking(uuid(1), at(0));
    const raw = JSON.parse(localStorage.getItem(RAW_KEY) ?? "null");
    expect(raw).toEqual([{ id: uuid(1), savedAt: at(0).toISOString() }]);
    expect(Object.keys(raw[0]).sort()).toEqual(["id", "savedAt"]);
  });

  it("gravar de novo não duplica", () => {
    recordBooking(uuid(1), at(0));
    recordBooking(uuid(1), at(1));
    expect(readBookingHistory()).toHaveLength(1);
  });

  it("id que não é UUID v4 não é gravado", () => {
    recordBooking("1", at(0));
    recordBooking("../hotels/1", at(0));
    expect(localStorage.getItem(RAW_KEY)).toBeNull();
  });

  it("storage corrompido vira lista vazia e o próximo registro recomeça", () => {
    localStorage.setItem(RAW_KEY, "{não é json");
    expect(readBookingHistory()).toEqual([]);
    localStorage.setItem(RAW_KEY, JSON.stringify({ id: uuid(1) }));
    expect(readBookingHistory()).toEqual([]);
    recordBooking(uuid(2), at(0));
    expect(readBookingHistory().map((item) => item.id)).toEqual([uuid(2)]);
  });

  it("descarta a entrada inválida e mantém as boas", () => {
    localStorage.setItem(
      RAW_KEY,
      JSON.stringify([
        { id: "1", savedAt: at(0).toISOString() },
        { id: uuid(3), savedAt: at(1).toISOString() },
        { id: uuid(4), savedAt: "ontem" },
      ]),
    );
    expect(readBookingHistory().map((item) => item.id)).toEqual([uuid(3)]);
  });
});

describe("removeFromHistory", () => {
  it("remove só o id pedido", () => {
    recordBooking(uuid(1), at(0));
    recordBooking(uuid(2), at(1));
    removeFromHistory(uuid(1));
    expect(readBookingHistory().map((item) => item.id)).toEqual([uuid(2)]);
  });
});
