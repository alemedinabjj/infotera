import { describe, expect, it } from "vitest";
import { parseHotelId } from "./hotel-id";

describe("parseHotelId", () => {
  it.each([
    ["1", 1],
    ["59", 59],
    ["123456789", 123456789],
  ])("aceita %s", (raw, expected) => {
    expect(parseHotelId(raw)).toBe(expected);
  });

  it.each(["abc", "0", "01", "1.5", "-1", "1e3", "", "1234567890", " 1", "1 ", "+1", "0x10"])(
    "rejeita %j",
    (raw) => {
      expect(parseHotelId(raw)).toBeNull();
    },
  );
});
