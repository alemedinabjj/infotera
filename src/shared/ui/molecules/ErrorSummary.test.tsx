import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { describeErrorCount, ErrorSummary } from "./ErrorSummary";

describe("describeErrorCount", () => {
  it("concorda no singular e no plural", () => {
    expect(describeErrorCount(1)).toBe("Corrija 1 campo para continuar");
    expect(describeErrorCount(3)).toBe("Corrija 3 campos para continuar");
  });
});

describe("ErrorSummary", () => {
  const items = [
    { id: "email", label: "E-mail", message: "Informe o e-mail." },
    { id: "phone", label: "Telefone", message: "Informe o telefone." },
  ];

  it("é um alerta com título de contagem e um botão por erro", () => {
    render(<ErrorSummary items={items} onSelect={() => undefined} />);
    expect(screen.getByRole("alert")).toHaveTextContent("Corrija 2 campos para continuar");
    expect(screen.getAllByRole("button").map((b) => b.textContent)).toEqual([
      "E-mail: Informe o e-mail.",
      "Telefone: Informe o telefone.",
    ]);
  });

  it("chama onSelect com o id do item", async () => {
    const onSelect = vi.fn<(id: string) => void>();
    render(<ErrorSummary items={items} onSelect={onSelect} />);
    await userEvent.click(screen.getByRole("button", { name: /Telefone/ }));
    expect(onSelect).toHaveBeenCalledWith("phone");
  });
});
