import { QueryClient } from "@tanstack/react-query";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/shared/api/http";
import { fetchSuggestions, suggestionsQueryOptions } from "./suggestions";

const suggestion = {
  id: 2,
  name: "São Paulo, SP",
  type: "city",
  country: "Brasil",
  searchName: "sao paulo, sp",
};

const stubFetch = (body: unknown, status = 200) => {
  const mock = vi.fn<typeof fetch>(async () => new Response(JSON.stringify(body), { status }));
  vi.stubGlobal("fetch", mock);
  return mock;
};

afterEach(() => vi.unstubAllGlobals());

describe("suggestionsQueryOptions", () => {
  it("busca com o texto normalizado", async () => {
    const mock = stubFetch([suggestion]);
    const client = new QueryClient();
    const data = await client.fetchQuery(suggestionsQueryOptions("São"));
    expect(data).toEqual([suggestion]);
    expect(String(mock.mock.calls[0]?.[0])).toBe("http://api.test/suggestions?q=sao");
  });

  it("chave normalizada: São e sao dividem cache", () => {
    expect(suggestionsQueryOptions("São").queryKey).toEqual(
      suggestionsQueryOptions(" sao ").queryKey,
    );
  });

  it("não repete a requisição sozinha: falha aparece na hora", () => {
    expect(suggestionsQueryOptions("sao").retry).toBe(0);
  });

  it.each(["", " ", "s", " s ", "á"])("desabilitada para %j", (q) => {
    expect(suggestionsQueryOptions(q).enabled).toBe(false);
  });

  it("habilitada com 2+ caracteres", () => {
    expect(suggestionsQueryOptions("sa").enabled).toBe(true);
  });

  it("mantém resultados anteriores e cache de 5 minutos", () => {
    const options = suggestionsQueryOptions("sao");
    expect(options.staleTime).toBe(300_000);
    expect(options.placeholderData).toBeTypeOf("function");
  });

  it("resposta fora do contrato vira ApiError de parse", async () => {
    stubFetch([{ id: "x" }]);
    await expect(fetchSuggestions("sao")).rejects.toMatchObject({
      name: "ApiError",
      kind: "parse",
    });
    await expect(fetchSuggestions("sao")).rejects.toBeInstanceOf(ApiError);
  });

  it("500 vira ApiError http", async () => {
    stubFetch({ error: "x" }, 500);
    await expect(fetchSuggestions("sao")).rejects.toMatchObject({ kind: "http", status: 500 });
  });
});
