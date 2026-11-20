import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { FormProvider, useForm } from "react-hook-form";
import { describe, expect, it } from "vitest";
import { searchFormResolver } from "../model/search-form.resolver";
import { DEFAULT_SEARCH_FORM_VALUES, type SearchFormValues } from "../model/search-form.schema";
import { GuestsPicker } from "./GuestsPicker";

const Harness = ({ values }: { values?: Partial<SearchFormValues> }) => {
  const form = useForm<SearchFormValues>({
    defaultValues: { ...DEFAULT_SEARCH_FORM_VALUES, ...values },
    resolver: searchFormResolver,
  });
  return (
    <FormProvider {...form}>
      <form onSubmit={form.handleSubmit(() => undefined)}>
        <GuestsPicker />
        <button type="submit">Enviar</button>
      </form>
    </FormProvider>
  );
};

const group = (name: string) => screen.getByRole("group", { name });
const value = (name: string) => within(group(name)).getByRole("status");
const button = (name: string) => screen.getByRole("button", { name });

describe("GuestsPicker", () => {
  it("mostra os três steppers com rótulo, descrição e valor padrão", () => {
    render(<Harness />);
    expect(screen.getByRole("group", { name: "Quartos e hóspedes" })).toBeInTheDocument();
    expect(value("Adultos")).toHaveTextContent("2");
    expect(value("Crianças")).toHaveTextContent("0");
    expect(value("Quartos")).toHaveTextContent("1");
    expect(button("Diminuir adultos")).toHaveAccessibleDescription("A partir de 18 anos");
    expect(button("Aumentar crianças")).toHaveAccessibleDescription("Até 17 anos");
  });

  it("incrementa e decrementa, respeitando o mínimo com aria-disabled", async () => {
    const user = userEvent.setup();
    render(<Harness values={{ adults: 1 }} />);
    expect(button("Diminuir adultos")).toHaveAttribute("aria-disabled", "true");
    await user.click(button("Aumentar adultos"));
    expect(value("Adultos")).toHaveTextContent("2");
    await user.click(button("Aumentar crianças"));
    expect(value("Crianças")).toHaveTextContent("1");
    await user.click(button("Diminuir crianças"));
    await user.click(button("Diminuir crianças"));
    expect(value("Crianças")).toHaveTextContent("0");
    expect(button("Diminuir crianças")).toHaveAttribute("aria-disabled", "true");
  });

  it("1 quarto com 5 hóspedes bloqueia + de adultos e crianças e explica o motivo", () => {
    render(<Harness values={{ adults: 3, children: 2 }} />);
    for (const name of ["Aumentar adultos", "Aumentar crianças"]) {
      expect(button(name)).toHaveAttribute("aria-disabled", "true");
    }
    // O motivo aparece uma vez só (no 1º controle, já que ninguém mexeu ainda), sem repetir.
    expect(screen.getAllByText(/Até 5 hóspedes por quarto\./)).toHaveLength(1);
    expect(button("Aumentar adultos")).toHaveAccessibleDescription(
      /Até 5 hóspedes por quarto\. Adicione um quarto/,
    );
  });

  it("o motivo do teto fica no controle que a pessoa acabou de mexer", async () => {
    const user = userEvent.setup();
    render(<Harness values={{ adults: 3, children: 1 }} />);
    await user.click(button("Aumentar crianças"));
    expect(screen.getAllByText(/Até 5 hóspedes por quarto\./)).toHaveLength(1);
    expect(button("Aumentar crianças")).toHaveAccessibleDescription(
      /Até 5 hóspedes por quarto\. Adicione um quarto/,
    );
    expect(button("Aumentar adultos")).not.toHaveAccessibleDescription(/Até 5/);
  });

  it("2 quartos exigem 2 adultos; adicionar quarto libera mais hóspedes", async () => {
    const user = userEvent.setup();
    render(<Harness values={{ adults: 3, children: 2 }} />);
    await user.click(button("Aumentar quartos"));
    expect(value("Quartos")).toHaveTextContent("2");
    expect(button("Aumentar adultos")).not.toHaveAttribute("aria-disabled");
    await user.click(button("Diminuir adultos"));
    await user.click(button("Diminuir adultos"));
    expect(value("Adultos")).toHaveTextContent("2");
    expect(button("Diminuir adultos")).toHaveAttribute("aria-disabled", "true");
    expect(button("Diminuir adultos")).toHaveAccessibleDescription(
      /Cada quarto precisa de pelo menos 1 adulto\./,
    );
  });

  it("quartos não passam de adultos nem de 4", async () => {
    const user = userEvent.setup();
    render(<Harness values={{ adults: 2 }} />);
    await user.click(button("Aumentar quartos"));
    expect(button("Aumentar quartos")).toHaveAttribute("aria-disabled", "true");
    expect(button("Aumentar quartos")).toHaveAccessibleDescription(/Adicione um adulto/);
  });

  it("estado inicial inválido: erro do grupo no submit, com foco e aria-describedby", async () => {
    const user = userEvent.setup();
    render(<Harness values={{ rooms: 1, adults: 4, children: 4 }} />);
    await user.click(button("Enviar"));
    const message = await screen.findByText(/Cada quarto acomoda até 5 hóspedes/);
    expect(group("Quartos e hóspedes")).toHaveAccessibleDescription(/Cada quarto acomoda/);
    expect(message.closest("[tabindex='-1']")).toHaveFocus();
  });
});
