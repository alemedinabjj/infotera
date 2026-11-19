import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { Dialog } from "./Dialog";

const Harness = ({
  onClose = () => undefined,
  placement,
  size,
  footer,
}: {
  onClose?: () => void;
  placement?: "center" | "sheet";
  size?: "sm" | "md" | "full";
  footer?: string;
}) => {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>
        Ler termos
      </button>
      <Dialog
        open={open}
        title="Termos da reserva"
        placement={placement}
        size={size}
        footer={footer}
        onClose={() => {
          setOpen(false);
          onClose();
        }}
      >
        <p>Conteúdo</p>
      </Dialog>
    </>
  );
};

describe("Dialog", () => {
  it("abre com showModal e liga o título por aria-labelledby", async () => {
    const showModal = vi.spyOn(HTMLDialogElement.prototype, "showModal");
    render(<Harness />);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Ler termos" }));
    expect(showModal).toHaveBeenCalledOnce();
    expect(screen.getByRole("dialog", { name: "Termos da reserva" })).toBeInTheDocument();
  });

  it("fecha pelo botão Fechar, chama onClose e devolve o foco ao gatilho", async () => {
    const onClose = vi.fn();
    render(<Harness onClose={onClose} />);
    const trigger = screen.getByRole("button", { name: "Ler termos" });
    trigger.focus();
    await userEvent.click(trigger);
    await userEvent.click(screen.getByRole("button", { name: "Fechar" }));
    expect(onClose).toHaveBeenCalledOnce();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });

  it("fecha como o Esc nativo (close do <dialog>) e chama onClose", async () => {
    const onClose = vi.fn();
    render(<Harness onClose={onClose} />);
    const trigger = screen.getByRole("button", { name: "Ler termos" });
    await userEvent.click(trigger);
    // O Esc nativo fecha o <dialog> e dispara "close"; jsdom não simula a tecla, então chamamos close().
    document.querySelector("dialog")?.close();
    expect(onClose).toHaveBeenCalledOnce();
    expect(trigger).toHaveFocus();
  });

  it("trava o scroll do body enquanto aberto", async () => {
    render(<Harness />);
    await userEvent.click(screen.getByRole("button", { name: "Ler termos" }));
    expect(document.body.style.overflow).toBe("hidden");
    await userEvent.click(screen.getByRole("button", { name: "Fechar" }));
    expect(document.body.style.overflow).toBe("");
  });

  it("Esc (evento cancel) é interceptado: pede onClose e deixa o pai decidir", () => {
    const onClose = vi.fn();
    render(
      <Dialog open title="T" onClose={onClose}>
        <p>x</p>
      </Dialog>,
    );
    const dialog = screen.getByRole("dialog");
    const notPrevented = fireEvent(dialog, new Event("cancel", { cancelable: true }));
    expect(notPrevented).toBe(false);
    expect(onClose).toHaveBeenCalledOnce();
    expect(dialog).toHaveAttribute("open");
  });

  it("backdrop só fecha se pointerdown e click começaram no dialog", () => {
    const onClose = vi.fn();
    render(
      <Dialog open title="T" onClose={onClose} closeOnBackdrop>
        <p>Conteúdo</p>
      </Dialog>,
    );
    const dialog = screen.getByRole("dialog");
    // Arrasto: começou no conteúdo e terminou no backdrop.
    fireEvent.pointerDown(screen.getByText("Conteúdo"));
    fireEvent.click(dialog);
    expect(onClose).not.toHaveBeenCalled();
    // Clique real no backdrop.
    fireEvent.pointerDown(dialog);
    fireEvent.click(dialog);
    expect(onClose).toHaveBeenCalledOnce();
  });
});

describe("Dialog placement", () => {
  it("center é o padrão: centralizado, sem animação de sheet", () => {
    render(
      <Dialog open title="T" onClose={() => undefined}>
        <p>x</p>
      </Dialog>,
    );
    const dialog = screen.getByRole("dialog");
    expect(dialog).toHaveClass("m-auto", "rounded-dialog");
    expect(dialog).not.toHaveClass("animate-slide-up");
  });

  it("sheet cola embaixo, ocupa a largura e anima de baixo para cima", () => {
    render(
      <Dialog
        open
        title="Filtros"
        placement="sheet"
        onClose={() => undefined}
        footer={<p>rodapé</p>}
      >
        <p>x</p>
      </Dialog>,
    );
    const dialog = screen.getByRole("dialog", { name: "Filtros" });
    expect(dialog).toHaveClass("mt-auto", "w-full", "rounded-t-dialog", "animate-slide-up");
    expect(dialog).not.toHaveClass("m-auto");
    expect(screen.getByText("rodapé").parentElement).toHaveClass("flex-row");
  });

  it("sheet fecha pelo Esc (cancel) e devolve o foco ao gatilho", async () => {
    const onClose = vi.fn();
    render(<Harness onClose={onClose} placement="sheet" />);
    const trigger = screen.getByRole("button", { name: "Ler termos" });
    await userEvent.click(trigger);
    fireEvent(screen.getByRole("dialog"), new Event("cancel", { cancelable: true }));
    expect(onClose).toHaveBeenCalledOnce();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });
});

describe("Dialog initialFocus", () => {
  it("foca o controle indicado em vez do botão Fechar", () => {
    render(
      <Dialog open title="T" onClose={() => undefined} initialFocus="input[name='primeiro']">
        <input name="primeiro" aria-label="Primeiro" />
      </Dialog>,
    );
    expect(screen.getByLabelText("Primeiro")).toHaveFocus();
  });

  describe("size full", () => {
    it("ocupa a tela toda, com fundo escuro, sem borda e sem max-h", () => {
      render(<Harness size="full" />);
      fireEvent.click(screen.getByRole("button", { name: "Ler termos" }));
      const dialog = screen.getByRole("dialog", { name: "Termos da reserva" });
      for (const expected of [
        "inset-0",
        "h-dvh",
        "w-full",
        "max-h-none",
        "bg-fg",
        "rounded-none",
      ]) {
        expect(dialog).toHaveClass(expected);
      }
      expect(dialog).not.toHaveClass("max-w-lg");
    });

    it("mostra o footer e fecha com Esc devolvendo o foco ao gatilho", async () => {
      const onClose = vi.fn();
      render(<Harness size="full" footer="Foto 1 de 5" onClose={onClose} />);
      const trigger = screen.getByRole("button", { name: "Ler termos" });
      trigger.focus();
      await userEvent.click(trigger);
      expect(screen.getByText("Foto 1 de 5")).toBeInTheDocument();
      fireEvent(screen.getByRole("dialog"), new Event("cancel", { cancelable: true }));
      expect(onClose).toHaveBeenCalledOnce();
      expect(trigger).toHaveFocus();
    });

    it("não fecha ao clicar no dialog (sem backdrop visível)", async () => {
      const onClose = vi.fn();
      render(<Harness size="full" onClose={onClose} />);
      await userEvent.click(screen.getByRole("button", { name: "Ler termos" }));
      await userEvent.click(screen.getByRole("dialog"));
      expect(onClose).not.toHaveBeenCalled();
    });
  });
});
