import { onlineManager } from "@tanstack/react-query";
import { screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ALL, hotelsResponse, paged, start, stubApi } from "../testing/harness";

vi.mock(
  "next/navigation",
  async () => (await import("@/shared/testing/next-navigation")).navigationMock,
);

beforeEach(() => {
  onlineManager.setOnline(true);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("HotelSearchResults: distância no card (critérios 1 e 6)", () => {
  it("cada card mostra a distância do centro em qualquer ordenação", async () => {
    stubApi();
    start();
    await screen.findAllByRole("heading", { level: 3 });
    expect(screen.getAllByText(/do centro$/, { selector: "p" })).toHaveLength(10);
  });

  it("falha do centroide: a lista aparece sem a linha de distância", async () => {
    stubApi((url) =>
      url.searchParams.has("_page") ? paged(url) : new Response("{}", { status: 500 }),
    );
    start();
    expect(await screen.findAllByRole("heading", { level: 3 })).toHaveLength(10);
    expect(screen.queryByText(/do centro$/, { selector: "p" })).not.toBeInTheDocument();
  });

  it("destino com 1 hotel não mostra distância", async () => {
    stubApi(() => hotelsResponse(ALL.slice(0, 1), 1));
    start();
    await screen.findAllByRole("heading", { level: 3 });
    expect(screen.queryByText(/do centro$/, { selector: "p" })).not.toBeInTheDocument();
  });
});
