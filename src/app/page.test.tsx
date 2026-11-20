import { screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { setTestUrl } from "@/shared/testing/next-navigation";
import { renderWithProviders } from "@/shared/testing/render";
import HomePage, { metadata } from "./page";

vi.mock(
  "next/navigation",
  async () => (await import("@/shared/testing/next-navigation")).navigationMock,
);

describe("HomePage", () => {
  beforeEach(() => setTestUrl("/"));

  it("tem título em pt-BR, um único h1 e o formulário nomeado por ele", () => {
    renderWithProviders(<HomePage />);
    expect(metadata.title).toBe("Buscar hotéis | Infotera Hotéis");
    const headings = screen.getAllByRole("heading", { level: 1 });
    expect(headings).toHaveLength(1);
    expect(headings[0]).toHaveTextContent("Encontre seu hotel");
    const form = screen.getByRole("form", { name: "Encontre seu hotel" });
    expect(form).toHaveAttribute("novalidate");
    expect(screen.getByRole("button", { name: "Buscar hotéis" })).toBeInTheDocument();
  });

  it("mostra o aviso visível quando o checkout redirecionou sem quarto", () => {
    setTestUrl("/?notice=choose-room");
    renderWithProviders(<HomePage />);
    expect(screen.getByText("Escolha um quarto para continuar.")).toBeVisible();
  });

  it("sem o parâmetro não mostra o aviso", () => {
    renderWithProviders(<HomePage />);
    expect(screen.queryByText("Escolha um quarto para continuar.")).not.toBeInTheDocument();
  });
});
