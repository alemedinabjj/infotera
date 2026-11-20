import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { TimeoutError, withTimeout } from "./timeout";

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe("withTimeout", () => {
  it("resolve com o valor quando responde a tempo", async () => {
    await expect(withTimeout(Promise.resolve(7), 1000)).resolves.toBe(7);
    expect(vi.getTimerCount()).toBe(0);
  });

  it("rejeita com TimeoutError quando passa do prazo", async () => {
    const pending = withTimeout(new Promise<number>(() => undefined), 15_000);
    const assertion = expect(pending).rejects.toBeInstanceOf(TimeoutError);
    await vi.advanceTimersByTimeAsync(15_000);
    await assertion;
  });

  it("repassa a rejeição original", async () => {
    await expect(withTimeout(Promise.reject(new Error("x")), 1000)).rejects.toThrow("x");
  });
});
