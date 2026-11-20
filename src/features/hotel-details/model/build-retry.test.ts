import { describe, expect, it, vi } from "vitest";
import { ApiError } from "@/shared/api/http";
import { backoffDelays, isRetryableBuildError, withRetry } from "./build-retry";

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

describe("isRetryableBuildError", () => {
  it("repete 408 (request timeout) e 429 (rate limit), que passam sozinhos", () => {
    expect(isRetryableBuildError(new ApiError("http", 408, "lento"))).toBe(true);
    expect(isRetryableBuildError(new ApiError("http", 429, "muitas"))).toBe(true);
  });

  it("repete falha de rede, timeout e 5xx", () => {
    expect(isRetryableBuildError(new ApiError("network", null, "off"))).toBe(true);
    expect(isRetryableBuildError(new ApiError("timeout", null, "lento"))).toBe(true);
    expect(isRetryableBuildError(new ApiError("http", 503, "acordando"))).toBe(true);
  });

  it("não repete 404, outros 4xx, resposta fora do schema nem erro desconhecido", () => {
    expect(isRetryableBuildError(new ApiError("http", 404, "nao achou"))).toBe(false);
    expect(isRetryableBuildError(new ApiError("http", 400, "ruim"))).toBe(false);
    expect(isRetryableBuildError(new ApiError("http", 409, "conflito"))).toBe(false);
    expect(isRetryableBuildError(new ApiError("parse", 200, "schema"))).toBe(false);
    expect(isRetryableBuildError(new Error("x"))).toBe(false);
  });
});

describe("withRetry com retryIf", () => {
  it("relança na hora o erro que não deve ser repetido, sem dormir", async () => {
    const sleep = vi.fn(async () => undefined);
    const fn = vi.fn(async () => {
      throw new ApiError("http", 404, "nao achou");
    });
    await expect(
      withRetry(fn, {
        delays: [10, 20],
        sleep,
        onRetry: vi.fn(),
        retryIf: isRetryableBuildError,
      }),
    ).rejects.toThrow("nao achou");
    expect(fn).toHaveBeenCalledTimes(1);
    expect(sleep).not.toHaveBeenCalled();
  });
});
