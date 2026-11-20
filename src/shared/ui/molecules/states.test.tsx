import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { Alert } from "./Alert";
import { EmptyState } from "./EmptyState";
import { ErrorState } from "./ErrorState";

describe("ErrorState", () => {
  it("tem role=alert e o retry chama onRetry", async () => {
    const onRetry = vi.fn();
    render(<ErrorState title="Não foi possível carregar os hotéis" onRetry={onRetry} />);
    expect(screen.getByRole("alert")).toHaveTextContent("Não foi possível carregar os hotéis");
    await userEvent.click(screen.getByRole("button", { name: "Tentar de novo" }));
    expect(onRetry).toHaveBeenCalledOnce();
  });

  it("durante o retry o botão fica em loading", () => {
    render(<ErrorState title="Erro" onRetry={() => undefined} retrying />);
    const button = screen.getByRole("button", { name: "Tentando…" });
    expect(button).toHaveAttribute("aria-disabled", "true");
    expect(button).toHaveAttribute("aria-busy", "true");
  });
});

describe("EmptyState", () => {
  it("mostra título, descrição e ação opcional", () => {
    render(
      <EmptyState
        title="Nenhum hotel com esses filtros"
        description="Tente remover alguma comodidade."
        action={<button type="button">Limpar filtros</button>}
      />,
    );
    expect(
      screen.getByRole("heading", { name: "Nenhum hotel com esses filtros" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Limpar filtros" })).toBeInTheDocument();
  });

  it("funciona sem ação", () => {
    render(<EmptyState title="Ainda sem avaliações" />);
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });
});

describe("Alert", () => {
  it("danger usa role=alert; demais tons usam status", () => {
    const { rerender } = render(<Alert tone="danger" title="Falhou" />);
    expect(screen.getByRole("alert")).toHaveTextContent("Falhou");
    rerender(<Alert tone="warning" title="Atenção" />);
    expect(screen.getByRole("status")).toHaveTextContent("Atenção");
  });

  it("aceita um ícone próprio no lugar do ícone do tom", () => {
    render(<Alert tone="warning" title="Sem internet" icon={<svg data-testid="custom" />} />);
    expect(screen.getByTestId("custom")).toBeInTheDocument();
  });
});
