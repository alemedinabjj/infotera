import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { I18nProvider } from "@/shared/i18n/client";
import { MapToggle } from "./MapToggle";

describe("MapToggle", () => {
  it("fechado: 'Mostrar mapa', não pressionado, sem aria-controls", () => {
    render(<MapToggle open={false} controls={undefined} onToggle={vi.fn()} />);
    const button = screen.getByRole("button", { name: "Mostrar mapa" });
    expect(button).toHaveAttribute("aria-pressed", "false");
    expect(button).not.toHaveAttribute("aria-controls");
  });

  it("aberto: 'Ocultar mapa', pressionado e ligado ao painel", () => {
    render(<MapToggle open controls="painel" onToggle={vi.fn()} />);
    const button = screen.getByRole("button", { name: "Ocultar mapa" });
    expect(button).toHaveAttribute("aria-pressed", "true");
    expect(button).toHaveAttribute("aria-controls", "painel");
  });

  it("clicar alterna", async () => {
    const onToggle = vi.fn();
    render(<MapToggle open={false} controls={undefined} onToggle={onToggle} />);
    await userEvent.click(screen.getByRole("button"));
    expect(onToggle).toHaveBeenCalledTimes(1);
  });

  it("em inglês usa Show map / Hide map", () => {
    const { rerender } = render(
      <I18nProvider locale="en-US">
        <MapToggle open={false} controls={undefined} onToggle={vi.fn()} />
      </I18nProvider>,
    );
    expect(screen.getByRole("button", { name: "Show map" })).toBeInTheDocument();
    rerender(
      <I18nProvider locale="en-US">
        <MapToggle open controls="x" onToggle={vi.fn()} />
      </I18nProvider>,
    );
    expect(screen.getByRole("button", { name: "Hide map" })).toBeInTheDocument();
  });
});
