import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { FormProvider, useForm } from "react-hook-form";
import { describe, expect, it } from "vitest";
import { addDays, todayISO } from "@/shared/lib/dates";
import type { DateNotice } from "../model/notices";
import { searchFormResolver } from "../model/search-form.resolver";
import {
  DEFAULT_SEARCH_FORM_VALUES,
  FORM_MESSAGES,
  type SearchFormValues,
} from "../model/search-form.schema";
import { DateRangeFields } from "./DateRangeFields";

const Harness = () => {
  const form = useForm<SearchFormValues>({
    defaultValues: DEFAULT_SEARCH_FORM_VALUES,
    resolver: searchFormResolver,
    mode: "onTouched",
    reValidateMode: "onChange",
  });
  const [notice, setNotice] = useState<DateNotice | null>(null);
  return (
    <FormProvider {...form}>
      <form>
        <DateRangeFields notice={notice} onNotice={setNotice} />
      </form>
    </FormProvider>
  );
};

const TODAY = todayISO();
const setup = () => {
  render(<Harness />);
  return {
    checkIn: screen.getByLabelText(/Check-in/),
    checkOut: screen.getByLabelText(/Check-out/),
  };
};

describe("DateRangeFields", () => {
  it("agrupa em fieldset 'Datas da estadia' e mostra a dica inicial", () => {
    setup();
    expect(screen.getByRole("group", { name: "Datas da estadia" })).toBeInTheDocument();
    expect(screen.getByText("Escolha as datas para ver o total de noites.")).toHaveAttribute(
      "aria-live",
      "polite",
    );
  });

  it("check-in tem min = hoje; check-out segue o check-in (+1 e +30)", () => {
    const { checkIn, checkOut } = setup();
    expect(checkIn).toHaveAttribute("min", TODAY);
    expect(checkOut).toHaveAttribute("min", addDays(TODAY, 1));
    expect(checkOut).not.toHaveAttribute("max");
    const start = addDays(TODAY, 5);
    fireEvent.change(checkIn, { target: { value: start } });
    expect(checkOut).toHaveAttribute("min", addDays(start, 1));
    expect(checkOut).toHaveAttribute("max", addDays(start, 30));
  });

  it("check-out vazio vira check-in + 1, sem aviso", () => {
    const { checkIn, checkOut } = setup();
    const start = addDays(TODAY, 5);
    fireEvent.change(checkIn, { target: { value: start } });
    expect(checkOut).toHaveValue(addDays(start, 1));
    expect(screen.queryByText(/Check\u2011out ajustado/)).not.toBeInTheDocument();
    expect(screen.getByText(/^1 noite ·/)).toBeInTheDocument();
  });

  it("check-out ≤ check-in vira check-in + 1 e mostra o aviso até a próxima mudança", () => {
    const { checkIn, checkOut } = setup();
    fireEvent.change(checkIn, { target: { value: addDays(TODAY, 2) } });
    fireEvent.change(checkOut, { target: { value: addDays(TODAY, 4) } });
    const later = addDays(TODAY, 10);
    fireEvent.change(checkIn, { target: { value: later } });
    expect(checkOut).toHaveValue(addDays(later, 1));
    const [year, month, day] = addDays(later, 1).split("-");
    expect(screen.getByText(`Check\u2011out ajustado para ${day}/${month}/${year}.`)).toBeVisible();
    fireEvent.change(checkOut, { target: { value: addDays(later, 3) } });
    expect(screen.queryByText(/Check\u2011out ajustado/)).not.toBeInTheDocument();
  });

  it("período válido mostra N noites com dias da semana", () => {
    const { checkIn, checkOut } = setup();
    fireEvent.change(checkIn, { target: { value: addDays(TODAY, 3) } });
    fireEvent.change(checkOut, { target: { value: addDays(TODAY, 6) } });
    const summary = screen.getByText(/^3 noites · /);
    expect(summary).toHaveAttribute("aria-live", "polite");
  });

  it("check-in no passado: erro ao sair do campo e atualiza a cada mudança", async () => {
    const user = userEvent.setup();
    const { checkIn } = setup();
    fireEvent.change(checkIn, { target: { value: addDays(TODAY, -2) } });
    expect(screen.queryByText("Escolha uma data a partir de hoje.")).not.toBeInTheDocument();
    await user.click(checkIn);
    await user.tab();
    expect(await screen.findByText("Escolha uma data a partir de hoje.")).toBeInTheDocument();
    expect(checkIn).toHaveAttribute("aria-invalid", "true");
    fireEvent.change(checkIn, { target: { value: addDays(TODAY, 1) } });
    await waitFor(() =>
      expect(screen.queryByText("Escolha uma data a partir de hoje.")).not.toBeInTheDocument(),
    );
  });

  it("31 noites mostra o erro e fica sem resumo; corrigir limpa", async () => {
    const user = userEvent.setup();
    const { checkIn, checkOut } = setup();
    const start = addDays(TODAY, 1);
    fireEvent.change(checkIn, { target: { value: start } });
    fireEvent.change(checkOut, { target: { value: addDays(start, 31) } });
    await user.click(checkOut);
    await user.tab();
    expect(await screen.findByText("A estadia pode ter no máximo 30 noites.")).toBeInTheDocument();
    expect(screen.queryByText(/noites ·/)).not.toBeInTheDocument();
    fireEvent.change(checkOut, { target: { value: addDays(start, 30) } });
    await waitFor(() =>
      expect(screen.queryByText("A estadia pode ter no máximo 30 noites.")).not.toBeInTheDocument(),
    );
    expect(screen.getByText(/^30 noites ·/)).toBeInTheDocument();
  });

  it("check-out vazio mostra a mensagem ao sair do campo; escolher o check-in limpa o erro", async () => {
    const user = userEvent.setup();
    const { checkIn, checkOut } = setup();
    await user.click(checkOut);
    await user.tab();
    expect(await screen.findByText(FORM_MESSAGES.checkOutRequired)).toBeInTheDocument();
    fireEvent.change(checkIn, { target: { value: addDays(TODAY, 2) } });
    await waitFor(() =>
      expect(screen.queryByText(FORM_MESSAGES.checkOutRequired)).not.toBeInTheDocument(),
    );
    expect(checkOut).toHaveValue(addDays(TODAY, 3));
  });
});
