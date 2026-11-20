import { screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { renderWithProviders } from "@/shared/testing/render";
import HomePage, { metadata } from "./page";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));

describe("HomePage", () => {
  const props = (notice?: string) =>
    ({
      params: Promise.resolve({}),
      searchParams: Promise.resolve(notice ? { notice } : {}),
    }) satisfies PageProps<"/">;

  it("tem título em pt-BR, um único h1 e o formulário nomeado por ele", async () => {
    renderWithProviders(await HomePage(props()));
    expect(metadata.title).toBe("Buscar hotéis | Infotera Hotéis");
    const headings = screen.getAllByRole("heading", { level: 1 });
    expect(headings).toHaveLength(1);
    expect(headings[0]).toHaveTextContent("Encontre seu hotel");
    const form = screen.getByRole("form", { name: "Encontre seu hotel" });
    expect(form).toHaveAttribute("novalidate");
    expect(screen.getByRole("button", { name: "Buscar hotéis" })).toBeInTheDocument();
  });

  it("mostra o aviso visível quando o checkout redirecionou sem quarto", async () => {
    renderWithProviders(await HomePage(props("choose-room")));
    expect(screen.getByText("Escolha um quarto para continuar.")).toBeVisible();
  });

  it("sem o parâmetro não mostra o aviso", async () => {
    renderWithProviders(await HomePage(props()));
    expect(screen.queryByText("Escolha um quarto para continuar.")).not.toBeInTheDocument();
  });
});
