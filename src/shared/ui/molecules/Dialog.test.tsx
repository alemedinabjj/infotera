import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { Dialog } from "./Dialog";

const Harness = ({ onClose = () => undefined }: { onClose?: () => void }) => {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>
        Ler termos
      </button>
      <Dialog
        open={open}
        title="Termos da reserva"
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
});
