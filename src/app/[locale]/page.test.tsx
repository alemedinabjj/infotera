import { screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { setTestUrl } from "@/shared/testing/next-navigation";
import { renderWithProviders } from "@/shared/testing/render";
import HomePage, { generateMetadata } from "./page";

vi.mock(
  "next/navigation",
  async () => (await import("@/shared/testing/next-navigation")).navigationMock,
);

const props = (locale: string) => ({
  params: Promise.resolve({ locale }),
  searchParams: Promise.resolve({}),
});

describe("HomePage", () => {
  beforeEach(() => setTestUrl("/"));

  it("tem título em pt-BR, um único h1 e o formulário nomeado por ele", async () => {
    renderWithProviders(await HomePage(props("pt-BR")));
    expect((await generateMetadata(props("pt-BR"))).title).toBe("Buscar hotéis | Infotera Hotéis");
    const headings = screen.getAllByRole("heading", { level: 1 });
    expect(headings).toHaveLength(1);
    expect(headings[0]).toHaveTextContent("Encontre seu hotel");
    const form = screen.getByRole("form", { name: "Encontre seu hotel" });
    expect(form).toHaveAttribute("novalidate");
    expect(screen.getByRole("button", { name: "Buscar hotéis" })).toBeInTheDocument();
  });

  it("declara os idiomas alternativos (hreflang)", async () => {
    expect((await generateMetadata(props("pt-BR"))).alternates?.languages).toEqual({
      "pt-BR": "/",
      "en-US": "/en",
      "x-default": "/",
    });
  });

  it("mostra o aviso visível quando o checkout redirecionou sem quarto", async () => {
    setTestUrl("/?notice=choose-room");
    renderWithProviders(await HomePage(props("pt-BR")));
    expect(screen.getByText("Escolha um quarto para continuar.")).toBeVisible();
  });

  it("em en-US título, h1 e aviso vêm em inglês", async () => {
    setTestUrl("/en?notice=choose-room");
    renderWithProviders(await HomePage(props("en-US")), { locale: "en-US" });
    expect((await generateMetadata(props("en-US"))).title).toBe("Search hotels | Infotera Hotéis");
    expect(screen.getByRole("heading", { level: 1, name: "Find your hotel" })).toBeInTheDocument();
    expect(screen.getByText("Choose a room to continue.")).toBeVisible();
    expect(screen.getByRole("button", { name: "Search hotels" })).toBeInTheDocument();
  });

  it("sem o parâmetro não mostra o aviso", async () => {
    renderWithProviders(await HomePage(props("pt-BR")));
    expect(screen.queryByText("Escolha um quarto para continuar.")).not.toBeInTheDocument();
  });
});
