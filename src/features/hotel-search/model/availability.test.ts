import { describe, expect, it } from "vitest";
import { type AvailabilityStatus, availabilityStatus } from "./availability";

describe("availabilityStatus", () => {
  it.each<[number, number, AvailabilityStatus]>([
    [0, 1, "sold-out"],
    [0, 3, "sold-out"],
    [1, 1, "scarce"],
    [2, 1, "scarce"],
    [2, 2, "scarce"],
    [2, 3, "insufficient"],
    [1, 2, "insufficient"],
    [3, 1, "available"],
    [3, 3, "available"],
    [12, 4, "available"],
  ])("%i disponíveis para %i quartos → %s", (available, requested, expected) => {
    expect(availabilityStatus(available, requested)).toBe(expected);
  });
});
