import { describe, expect, it, vi } from "vitest";
import { backoffDelays, withRetry } from "./build-retry";

describe("backoffDelays", () => {
  it("cresce de forma exponencial e respeita o teto", () => {
    expect(backoffDelays(8, 2000, 15000)).toEqual([2000, 4000, 8000, 15000, 15000, 15000, 15000]);
  });

  it("devolve uma espera a menos que o número de tentativas", () => {
    expect(backoffDelays(1, 2000, 15000)).toEqual([]);
    expect(backoffDelays(2, 2000, 15000)).toEqual([2000]);
  });

  it("não aceita tentativas menores que 1", () => {
    expect(backoffDelays(0, 2000, 15000)).toEqual([]);
  });
});

describe("withRetry", () => {
  const delays = [10, 20, 30, 40];

  it("devolve o resultado na primeira tentativa sem dormir", async () => {
    const sleep = vi.fn(async () => undefined);
    const fn = vi.fn(async () => "ok");
    await expect(withRetry(fn, { delays, sleep, onRetry: vi.fn() })).resolves.toBe("ok");
    expect(sleep).not.toHaveBeenCalled();
  });

  it("tem sucesso na 3ª tentativa, dorme com as esperas e avisa n/total", async () => {
    const sleep = vi.fn(async () => undefined);
    const onRetry = vi.fn();
    let calls = 0;
    const fn = async () => {
      calls += 1;
      if (calls < 3) throw new Error(`falha ${calls}`);
      return "ok";
    };
    await expect(withRetry(fn, { delays, sleep, onRetry })).resolves.toBe("ok");
    expect(sleep.mock.calls).toEqual([[10], [20]]);
    expect(onRetry.mock.calls.map(([info]) => [info.attempt, info.total])).toEqual([
      [2, 5],
      [3, 5],
    ]);
  });

  it("esgotadas as tentativas relança o último erro", async () => {
    const sleep = vi.fn(async () => undefined);
    let calls = 0;
    const fn = async () => {
      calls += 1;
      throw new Error(`falha ${calls}`);
    };
    await expect(withRetry(fn, { delays, sleep, onRetry: vi.fn() })).rejects.toThrow("falha 5");
    expect(calls).toBe(5);
    expect(sleep).toHaveBeenCalledTimes(4);
  });
});
