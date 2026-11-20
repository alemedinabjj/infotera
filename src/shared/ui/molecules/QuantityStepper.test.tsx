import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { QuantityStepper } from "./QuantityStepper";

const Harness = ({
  initial,
  min = 1,
  max = 3,
  hint,
}: {
  initial: number;
  min?: number;
  max?: number;
  hint?: string;
}) => {
  const [value, setValue] = useState(initial);
  return (
    <QuantityStepper
      label="Adultos"
      description="A partir de 18 anos"
      hint={hint}
      value={value}
      min={min}
      max={max}
      onChange={setValue}
      decreaseLabel="Remover adulto"
      increaseLabel="Adicionar adulto"
    />
  );
};

describe("QuantityStepper", () => {
  it("agrupa pelo rótulo e mostra o valor em output", () => {
    render(<Harness initial={2} />);
    expect(screen.getByRole("group", { name: "Adultos" })).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("2");
  });

  it("incrementa e decrementa por mouse e teclado", async () => {
    const user = userEvent.setup();
    render(<Harness initial={2} />);
    await user.click(screen.getByRole("button", { name: "Adicionar adulto" }));
    expect(screen.getByRole("status")).toHaveTextContent("3");
    await user.tab();
    await user.tab();
    screen.getByRole("button", { name: "Remover adulto" }).focus();
    await user.keyboard("{Enter}");
    expect(screen.getByRole("status")).toHaveTextContent("2");
    await user.keyboard(" ");
    expect(screen.getByRole("status")).toHaveTextContent("1");
  });

  it("usa aria-disabled nos limites, mantém o foco e ignora cliques", async () => {
    const user = userEvent.setup();
    const { unmount } = render(<Harness initial={1} />);
    const decrease = screen.getByRole("button", { name: "Remover adulto" });
    expect(decrease).toHaveAttribute("aria-disabled", "true");
    expect(decrease).not.toBeDisabled();
    decrease.focus();
    await user.click(decrease);
    expect(decrease).toHaveFocus();
    expect(screen.getByRole("status")).toHaveTextContent("1");
    unmount();
    render(<Harness initial={3} />);
    const increase = screen.getByRole("button", { name: "Adicionar adulto" });
    expect(increase).toHaveAttribute("aria-disabled", "true");
    await user.click(increase);
    expect(screen.getByRole("status")).toHaveTextContent("3");
  });

  it("liga descrição e hint aos dois botões e mantém a região live sempre montada", () => {
    const { container, rerender } = render(<Harness initial={1} />);
    const live = container.querySelector("[aria-live='polite']:not(output)");
    expect(live).toBeEmptyDOMElement();
    const decrease = screen.getByRole("button", { name: "Remover adulto" });
    expect(decrease).toHaveAccessibleDescription("A partir de 18 anos");
    rerender(<Harness initial={1} hint="Até 5 hóspedes por quarto." />);
    expect(container.querySelector("[aria-live='polite']:not(output)")).toHaveTextContent(
      "Até 5 hóspedes por quarto.",
    );
    for (const name of ["Remover adulto", "Adicionar adulto"]) {
      expect(screen.getByRole("button", { name })).toHaveAccessibleDescription(
        "A partir de 18 anos Até 5 hóspedes por quarto.",
      );
    }
  });
});

describe("QuantityStepper locked", () => {
  it("bloqueia os dois botões com aria-disabled sem tirar o foco", async () => {
    const onChange = vi.fn<(value: number) => void>();
    render(
      <QuantityStepper
        label="Quartos"
        value={2}
        min={1}
        max={4}
        locked
        onChange={onChange}
        decreaseLabel="Remover quarto"
        increaseLabel="Adicionar quarto"
      />,
    );
    const plus = screen.getByRole("button", { name: "Adicionar quarto" });
    expect(plus).toHaveAttribute("aria-disabled", "true");
    await userEvent.click(plus);
    await userEvent.click(screen.getByRole("button", { name: "Remover quarto" }));
    expect(onChange).not.toHaveBeenCalled();
  });
});
