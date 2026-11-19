import { onlineManager } from "@tanstack/react-query";
import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { start, stubApi } from "../testing/harness";

vi.mock(
  "next/navigation",
  async () => (await import("@/shared/testing/next-navigation")).navigationMock,
);

/** Enquanto armado, o filtro de comodidades falha ao renderizar. */
const bomb = vi.hoisted(() => ({ armed: true }));

vi.mock("./AmenitiesFilter", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./AmenitiesFilter")>();
  const AmenitiesFilter = (props: Parameters<typeof actual.AmenitiesFilter>[0]) => {
    if (bomb.armed) throw new Error("render falhou");
    return actual.AmenitiesFilter(props);
  };
  return { AmenitiesFilter };
});

beforeEach(() => {
  bomb.armed = true;
  onlineManager.setOnline(true);
  vi.spyOn(console, "error").mockImplementation(() => undefined);
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("filtros: error boundary por seção (critério 20)", () => {
  it("erro num filtro mostra o aviso só na sidebar; lista, toolbar e paginação seguem operáveis", async () => {
    const user = userEvent.setup();
    stubApi();
    start();
    const sidebar = screen.getByRole("complementary");
    expect(within(sidebar).getByRole("alert")).toHaveTextContent(
      "Não foi possível mostrar os filtros.",
    );
    expect(within(sidebar).queryByRole("group", { name: "Comodidades" })).not.toBeInTheDocument();

    expect(await screen.findAllByRole("heading", { level: 3 })).toHaveLength(10);
    expect(screen.getByRole("navigation", { name: "Paginação" })).toBeInTheDocument();
    await user.selectOptions(screen.getByRole("combobox", { name: "Ordenar por" }), "Menor preço");
    expect(window.location.search).toContain("sort=price-asc");
    expect(screen.queryByRole("alert", { name: /hotéis/ })).not.toBeInTheDocument();
  });

  it("'Tentar de novo' remonta os filtros", async () => {
    const user = userEvent.setup();
    stubApi();
    start();
    const sidebar = screen.getByRole("complementary");
    bomb.armed = false;
    await user.click(within(sidebar).getByRole("button", { name: "Tentar de novo" }));
    expect(within(sidebar).getByRole("group", { name: "Comodidades" })).toBeInTheDocument();
    expect(within(sidebar).queryByRole("alert")).not.toBeInTheDocument();
  });

  it("o corpo do sheet tem a própria boundary", async () => {
    const user = userEvent.setup();
    stubApi();
    start();
    await screen.findAllByRole("heading", { level: 3 });
    await user.click(screen.getByRole("button", { name: "Filtros" }));
    const sheet = screen.getByRole("dialog");
    expect(within(sheet).getByRole("alert")).toHaveTextContent(
      "Não foi possível mostrar os filtros.",
    );
    expect(within(sheet).getByRole("button", { name: "Fechar filtros" })).toBeInTheDocument();
    bomb.armed = false;
    await user.click(within(sheet).getByRole("button", { name: "Tentar de novo" }));
    expect(within(sheet).getByRole("group", { name: "Comodidades" })).toBeInTheDocument();
  });
});
