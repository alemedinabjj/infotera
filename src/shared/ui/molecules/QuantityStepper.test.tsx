import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it } from "vitest";
import { QuantityStepper } from "./QuantityStepper";

const Harness = ({
  initial,
  min = 1,
  max = 3,
}: {
  initial: number;
  min?: number;
  max?: number;
}) => {
  const [value, setValue] = useState(initial);
  return (
    <QuantityStepper
      label="Adultos"
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
});
