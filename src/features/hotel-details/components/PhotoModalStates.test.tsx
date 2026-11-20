import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { navigationSpies } from "@/shared/testing/next-navigation";
import { renderWithProviders } from "@/shared/testing/render";
import { PhotoModalError } from "./PhotoModalError";
import { PhotoModalLoading } from "./PhotoModalLoading";

vi.mock(
  "next/navigation",
  async () => (await import("@/shared/testing/next-navigation")).navigationMock,
);

beforeEach(() => navigationSpies.back.mockReset());
afterEach(() => vi.restoreAllMocks());

describe("PhotoModalLoading (critério 18)", () => {
  it("é um dialog 'Fotos do hotel' com Fechar, Spinner e 'Carregando foto…' visível", () => {
    renderWithProviders(<PhotoModalLoading />);
    const dialog = screen.getByRole("dialog", { name: "Fotos do hotel" });
    expect(dialog).toHaveAttribute("open");
    expect(screen.getByRole("button", { name: "Fechar" })).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("Carregando foto…");
    expect(dialog.querySelector("[aria-busy='true']")).toBeInTheDocument();
  });

  it("Fechar volta uma única entrada, mesmo com cliques repetidos", async () => {
    const user = userEvent.setup();
    renderWithProviders(<PhotoModalLoading />);
    const close = screen.getByRole("button", { name: "Fechar" });
    await user.click(close);
    await user.click(close);
    await waitFor(() => expect(navigationSpies.back).toHaveBeenCalledTimes(1));
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(navigationSpies.back).toHaveBeenCalledTimes(1);
  });
});

describe("PhotoModalError (critério 18, U6)", () => {
  it("cartão com o erro, foco inicial em 'Tentar de novo' e um único 'Fechar'", () => {
    renderWithProviders(<PhotoModalError retry={() => undefined} />);
    expect(screen.getByRole("dialog", { name: "Fotos do hotel" })).toBeInTheDocument();
    expect(screen.getByRole("alert")).toHaveTextContent("Não foi possível abrir a foto");
    expect(screen.getByRole("button", { name: "Tentar de novo" })).toHaveFocus();
    expect(screen.getAllByRole("button", { name: "Fechar" })).toHaveLength(1);
  });

  it("'Tentar de novo' pede o retry da rota e atualiza o router", async () => {
    const user = userEvent.setup();
    const retry = vi.fn();
    renderWithProviders(<PhotoModalError retry={retry} />);
    await user.click(screen.getByRole("button", { name: "Tentar de novo" }));
    expect(retry).toHaveBeenCalledOnce();
    expect(navigationSpies.refresh).toHaveBeenCalledOnce();
  });
});
