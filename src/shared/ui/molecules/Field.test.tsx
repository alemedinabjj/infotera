import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Checkbox } from "../atoms/Checkbox";
import { Input } from "../atoms/Input";
import { Radio } from "../atoms/Radio";
import { Select } from "../atoms/Select";
import { Field } from "./Field";

describe("Field", () => {
  it("liga label, ajuda e controle sem erro", () => {
    render(
      <Field label="E-mail" description="Usaremos para confirmar.">
        {(control) => <Input {...control} />}
      </Field>,
    );
    const input = screen.getByLabelText("E-mail");
    expect(input).not.toHaveAttribute("aria-invalid");
    expect(input).toHaveAccessibleDescription("Usaremos para confirmar.");
  });

  it("com erro: aria-invalid, descrição inclui ajuda e erro, sem role=alert", () => {
    render(
      <Field label="E-mail" description="Ajuda" error="Informe o e-mail." required>
        {(control) => <Input {...control} />}
      </Field>,
    );
    const input = screen.getByLabelText(/E-mail/);
    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(input).toHaveAttribute("aria-required", "true");
    expect(input).toHaveAccessibleDescription("Ajuda Informe o e-mail.");
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("indica campo opcional", () => {
    render(
      <Field label="Telefone" optional>
        {(control) => <Input {...control} />}
      </Field>,
    );
    expect(screen.getByLabelText("Telefone (opcional)")).toBeInTheDocument();
  });

  it("funciona com Select", () => {
    render(
      <Field label="Ordenar por">
        {(control) => (
          <Select {...control}>
            <option>Preço</option>
          </Select>
        )}
      </Field>,
    );
    expect(screen.getByLabelText("Ordenar por")).toBeInTheDocument();
  });

  it("Checkbox e Radio são encontrados por label", () => {
    render(
      <>
        <Checkbox label="Piscina" />
        <Radio name="x" label="Hotel" />
      </>,
    );
    expect(screen.getByLabelText("Piscina")).toBeInTheDocument();
    expect(screen.getByLabelText("Hotel")).toBeInTheDocument();
  });
});
