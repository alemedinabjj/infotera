import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Toaster } from "./Toaster";
import { toast, useToastStore } from "./toast-store";

const advance = (ms: number) => act(() => vi.advanceTimersByTime(ms));

beforeEach(() => {
  vi.useFakeTimers();
  useToastStore.setState({ toasts: [] });
});

afterEach(() => {
  vi.useRealTimers();
});

describe("Toaster", () => {
  it("erro com ação vai para a região role=alert", () => {
    const onClick = vi.fn();
    render(<Toaster />);
    act(() => {
      toast.error("Não foi possível confirmar a reserva.", {
        action: { label: "Tentar de novo", onClick },
      });
    });
    const region = screen.getByRole("alert");
    expect(within(region).getByText("Não foi possível confirmar a reserva.")).toBeInTheDocument();
    fireEvent.click(within(region).getByRole("button", { name: "Tentar de novo" }));
    expect(onClick).toHaveBeenCalledOnce();
    expect(screen.queryByText("Não foi possível confirmar a reserva.")).not.toBeInTheDocument();
  });

  it("sucesso e info vão para a região role=status", () => {
    render(<Toaster />);
    act(() => {
      toast.success("Link copiado.");
      toast.info("Dica");
    });
    const region = screen.getByRole("status");
    expect(within(region).getByText("Link copiado.")).toBeInTheDocument();
    expect(within(region).getByText("Dica")).toBeInTheDocument();
  });

  it("some após 5s (8s no erro)", () => {
    render(<Toaster />);
    act(() => {
      toast.success("ok");
      toast.error("falhou");
    });
    advance(4999);
    expect(screen.getByText("ok")).toBeInTheDocument();
    advance(1);
    expect(screen.queryByText("ok")).not.toBeInTheDocument();
    advance(2998);
    expect(screen.getByText("falhou")).toBeInTheDocument();
    advance(2);
    expect(screen.queryByText("falhou")).not.toBeInTheDocument();
  });

  it("pausa com hover e retoma o tempo restante", () => {
    render(<Toaster />);
    act(() => {
      toast.info("pausado");
    });
    advance(3000);
    fireEvent.mouseEnter(screen.getByText("pausado"));
    advance(10_000);
    expect(screen.getByText("pausado")).toBeInTheDocument();
    fireEvent.mouseLeave(screen.getByText("pausado"));
    advance(1999);
    expect(screen.getByText("pausado")).toBeInTheDocument();
    advance(1);
    expect(screen.queryByText("pausado")).not.toBeInTheDocument();
  });

  it("pausa enquanto o foco está dentro", () => {
    render(<Toaster />);
    act(() => {
      toast.info("com foco");
    });
    fireEvent.focus(screen.getByRole("button", { name: "Fechar notificação" }));
    advance(10_000);
    expect(screen.getByText("com foco")).toBeInTheDocument();
  });

  it("mostra no máximo 3 (descarta o mais antigo)", () => {
    render(<Toaster />);
    act(() => {
      for (const message of ["um", "dois", "três", "quatro"]) toast.info(message);
    });
    expect(screen.queryByText("um")).not.toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: "Fechar notificação" })).toHaveLength(3);
  });

  it("botão Fechar notificação remove o toast", () => {
    render(<Toaster />);
    act(() => {
      toast.success("fechável");
    });
    fireEvent.click(screen.getByRole("button", { name: "Fechar notificação" }));
    expect(screen.queryByText("fechável")).not.toBeInTheDocument();
  });
});
