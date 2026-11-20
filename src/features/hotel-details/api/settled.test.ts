import { afterEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/shared/api/http";
import { settle } from "./settled";

const context = { resource: "rooms", hotelId: 7 };

afterEach(() => vi.restoreAllMocks());

describe("settle", () => {
  it("embrulha o valor resolvido, sem log", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    await expect(settle(Promise.resolve([1, 2]), context)).resolves.toEqual({
      kind: "ok",
      value: [1, 2],
    });
    expect(warn).not.toHaveBeenCalled();
  });

  it("transforma a rejeição em erro, sem relançar nem expor a causa", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const result = await settle(Promise.reject(new Error("API caiu: 500")), context);
    expect(result).toEqual({ kind: "error" });
  });

  it("loga recurso, hotel e tipo/status do ApiError, sem a mensagem nem o corpo", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    await settle(Promise.reject(new ApiError("http", 503, "corpo secreto da API")), context);
    expect(warn).toHaveBeenCalledWith("[hotel-details] catalog request failed", {
      resource: "rooms",
      hotelId: 7,
      kind: "http",
      status: 503,
    });
    expect(JSON.stringify(warn.mock.calls)).not.toContain("corpo secreto");
  });

  it("erro que não é ApiError: kind 'unknown', status null", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    await settle(Promise.reject(new Error("x")), context);
    expect(warn).toHaveBeenCalledWith("[hotel-details] catalog request failed", {
      resource: "rooms",
      hotelId: 7,
      kind: "unknown",
      status: null,
    });
  });
});
