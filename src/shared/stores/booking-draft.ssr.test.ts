// @vitest-environment node
import { describe, expect, it } from "vitest";
import { useBookingDraft, useBookingDraftActions } from "./booking-draft";

describe("booking-draft sem window (SSR)", () => {
  it("cria o store com persist e não lança ao usar as ações", async () => {
    expect(typeof window).toBe("undefined");
    expect(useBookingDraft.persist).toBeDefined();
    await expect(useBookingDraft.persist.rehydrate()).resolves.not.toThrow();
    expect(() => useBookingDraftActions().clearSelection()).not.toThrow();
  });
});
