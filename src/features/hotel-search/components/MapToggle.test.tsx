import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { I18nProvider } from "@/shared/i18n/client";
import { MapToggle } from "./MapToggle";

describe("MapToggle", () => {
  it("desligado: rótulo 'Mapa', não pressionado, sem aria-controls", () => {
    render(<MapToggle open={false} controls="painel" onToggle={vi.fn()} />);
    const button = screen.getByRole("button", { name: "Mapa" });
    expect(button).toHaveAttribute("aria-pressed", "false");
    expect(button).not.toHaveAttribute("aria-controls");
  });

  it("ligado com painel: mesmo rótulo, pressionado e ligado ao painel", () => {
    render(<MapToggle open controls="painel" onToggle={vi.fn()} />);
    const button = screen.getByRole("button", { name: "Mapa" });
    expect(button).toHaveAttribute("aria-pressed", "true");
    expect(button).toHaveAttribute("aria-controls", "painel");
  });

  it("ligado sem painel: continua pressionado, sem aria-controls, e clicar desliga", async () => {
    const onToggle = vi.fn();
    render(<MapToggle open controls={undefined} onToggle={onToggle} />);
    const button = screen.getByRole("button", { name: "Mapa" });
    expect(button).toHaveAttribute("aria-pressed", "true");
    expect(button).not.toHaveAttribute("aria-controls");
    await userEvent.click(button);
    expect(onToggle).toHaveBeenCalledTimes(1);
  });

  it("tem o ícone à esquerda, escondido do leitor de tela, e ocupa a largura no celular", () => {
    render(<MapToggle open={false} controls={undefined} onToggle={vi.fn()} />);
    const button = screen.getByRole("button", { name: "Mapa" });
    expect(button.querySelector("svg")).toHaveAttribute("aria-hidden", "true");
    expect(button).toHaveClass("w-full");
  });

  it("em inglês o rótulo é Map nos dois estados", () => {
    const { rerender } = render(
      <I18nProvider locale="en-US">
        <MapToggle open={false} controls={undefined} onToggle={vi.fn()} />
      </I18nProvider>,
    );
    expect(screen.getByRole("button", { name: "Map" })).toHaveAttribute("aria-pressed", "false");
    rerender(
      <I18nProvider locale="en-US">
        <MapToggle open controls="x" onToggle={vi.fn()} />
      </I18nProvider>,
    );
    expect(screen.getByRole("button", { name: "Map" })).toHaveAttribute("aria-pressed", "true");
  });
});
