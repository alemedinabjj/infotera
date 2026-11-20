import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
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

  it("fechar com o foco no X não deixa a região pausada para sempre", () => {
    render(<Toaster />);
    act(() => {
      toast.info("primeiro");
    });
    const close = screen.getByRole("button", { name: "Fechar notificação" });
    act(() => close.focus());
    fireEvent.click(close);
    expect(screen.queryByText("primeiro")).not.toBeInTheDocument();
    act(() => {
      toast.info("segundo");
    });
    advance(5000);
    expect(screen.queryByText("segundo")).not.toBeInTheDocument();
  });

  it("acionar a ação devolve o foco ao controle que criou o toast (nunca ao body)", async () => {
    vi.useRealTimers();
    render(
      <>
        <button type="button">Origem</button>
        <Toaster />
      </>,
    );
    const origin = screen.getByRole("button", { name: "Origem" });
    origin.focus();
    act(() => {
      toast.info("Removido.", { action: { label: "Desfazer", onClick: () => undefined } });
    });
    fireEvent.click(screen.getByRole("button", { name: "Desfazer" }));
    await waitFor(() => expect(origin).toHaveFocus());
  });

  it("returnFocus tem prioridade e ação que navega não mexe no foco", async () => {
    vi.useRealTimers();
    render(
      <>
        <button type="button">Origem</button>
        <h1 tabIndex={-1}>Título</h1>
        <Toaster />
      </>,
    );
    screen.getByRole("button", { name: "Origem" }).focus();
    act(() => {
      toast.info("Limpo.", {
        action: {
          label: "Desfazer",
          onClick: () => undefined,
          returnFocus: () => screen.getByRole("heading"),
        },
      });
    });
    fireEvent.click(screen.getByRole("button", { name: "Desfazer" }));
    await waitFor(() => expect(screen.getByRole("heading")).toHaveFocus());
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

  it("key igual substitui no lugar: 5 cliques geram 1 toast e reiniciam o tempo", () => {
    render(<Toaster />);
    act(() => {
      toast.info("salvo", { key: "favorite:1" });
    });
    advance(4000);
    act(() => {
      for (let index = 0; index < 4; index++) toast.info("salvo", { key: "favorite:1" });
    });
    expect(screen.getAllByText("salvo")).toHaveLength(1);
    advance(4999);
    expect(screen.getByText("salvo")).toBeInTheDocument();
    advance(1);
    expect(screen.queryByText("salvo")).not.toBeInTheDocument();
  });

  it("toast com ação dura 10 s", () => {
    render(<Toaster />);
    act(() => {
      toast.success("com ação", { action: { label: "Desfazer", onClick: vi.fn() } });
    });
    advance(9999);
    expect(screen.getByText("com ação")).toBeInTheDocument();
    advance(1);
    expect(screen.queryByText("com ação")).not.toBeInTheDocument();
  });

  it("hover em um toast pausa todos os toasts da região", () => {
    render(<Toaster />);
    act(() => {
      toast.info("primeiro");
      toast.info("segundo");
    });
    fireEvent.mouseEnter(screen.getByText("segundo"));
    advance(20_000);
    expect(screen.getByText("primeiro")).toBeInTheDocument();
    expect(screen.getByText("segundo")).toBeInTheDocument();
    fireEvent.mouseLeave(screen.getByText("segundo"));
    advance(5000);
    expect(screen.queryByText("primeiro")).not.toBeInTheDocument();
  });

  it("para com a aba oculta e volta a contar ao reexibir", () => {
    render(<Toaster />);
    act(() => {
      toast.info("aba");
    });
    advance(3000);
    const state = vi.spyOn(document, "visibilityState", "get");
    state.mockReturnValue("hidden");
    act(() => {
      document.dispatchEvent(new Event("visibilitychange"));
    });
    advance(30_000);
    expect(screen.getByText("aba")).toBeInTheDocument();
    state.mockReturnValue("visible");
    act(() => {
      document.dispatchEvent(new Event("visibilitychange"));
    });
    advance(2000);
    expect(screen.queryByText("aba")).not.toBeInTheDocument();
  });

  it("as regiões continuam montadas e o toast não recebe foco sozinho", () => {
    render(<Toaster />);
    expect(screen.getByRole("status")).toBeInTheDocument();
    expect(screen.getByRole("alert")).toBeInTheDocument();
    act(() => {
      toast.info("sem foco");
    });
    expect(document.body).toHaveFocus();
  });
});

describe("toast persistente", () => {
  it("não fecha sozinho, mesmo muito depois do prazo de um toast com ação", () => {
    render(<Toaster />);
    act(() => {
      toast.info("Nova versão disponível.", { persistent: true });
    });
    act(() => {
      vi.advanceTimersByTime(600_000);
    });
    expect(screen.getByText("Nova versão disponível.")).toBeInTheDocument();
  });
});
