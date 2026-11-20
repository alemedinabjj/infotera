import { screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { renderWithProviders } from "@/shared/testing/render";
import HomePage, { metadata } from "./page";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));

describe("HomePage", () => {
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
});
