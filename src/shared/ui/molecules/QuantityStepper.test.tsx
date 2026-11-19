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

  it("desabilita nos limites", () => {
    const { unmount } = render(<Harness initial={1} />);
    expect(screen.getByRole("button", { name: "Remover adulto" })).toBeDisabled();
    unmount();
    render(<Harness initial={3} />);
    expect(screen.getByRole("button", { name: "Adicionar adulto" })).toBeDisabled();
  });
});
