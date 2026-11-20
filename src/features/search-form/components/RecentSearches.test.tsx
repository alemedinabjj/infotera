import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { addDays, todayISO } from "@/shared/lib/dates";
import type { SearchCriteria } from "@/shared/lib/search-params";
import { renderWithProviders } from "@/shared/testing/render";
import { Toaster } from "@/shared/ui";
import { SearchForm } from "./SearchForm";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));

const KEY = "infotera:recent-searches";
const TODAY = todayISO();
const make = (overrides: Partial<SearchCriteria> = {}): SearchCriteria => ({
  destination: "São Paulo, SP",
  checkIn: addDays(TODAY, 10),
  checkOut: addDays(TODAY, 13),
  rooms: 1,
  adults: 2,
  children: 0,
  ...overrides,
});
const seed = (items: unknown) => localStorage.setItem(KEY, JSON.stringify(items));
const render = () =>
  renderWithProviders(
    <>
      <SearchForm />
      <Toaster />
    </>,
  );

beforeEach(() => {
  localStorage.clear();
  vi.stubGlobal("fetch", vi.fn());
});
afterEach(() => vi.unstubAllGlobals());

describe("RecentSearches", () => {
  it("sem histórico a seção não aparece", () => {
    render();
    expect(screen.queryByRole("heading", { name: "Buscas recentes" })).not.toBeInTheDocument();
  });

  it("lista os itens com resumo acessível, na ordem salva", async () => {
    seed([make(), make({ destination: "Gramado, RS", adults: 1, children: 2 })]);
    render();
    const list = await screen.findByRole("list");
    const buttons = list.querySelectorAll("button");
    expect(buttons).toHaveLength(2);
    expect(buttons[0]).toHaveAccessibleName(/^São Paulo, SP · .+ · 2 adultos · 1 quarto$/);
    expect(buttons[1]).toHaveAccessibleName(/Gramado, RS · .+ · 1 adulto, 2 crianças · 1 quarto/);
    expect(buttons[0]).toHaveAccessibleDescription("Preenche o formulário com esta busca.");
  });

  it("ao restaurar, traz o topo do formulário para a vista antes de focar o botão", async () => {
    const user = userEvent.setup();
    seed([make({ destination: "Gramado, RS" })]);
    const scrollIntoView = vi.fn<(options?: ScrollIntoViewOptions) => void>();
    Element.prototype.scrollIntoView = scrollIntoView;
    vi.spyOn(HTMLFormElement.prototype, "getBoundingClientRect").mockReturnValue(
      new DOMRect(0, -400, 300, 500),
    );
    render();
    await user.click(await screen.findByRole("button", { name: /Gramado, RS/ }));
    expect(scrollIntoView).toHaveBeenCalledWith({ block: "start" });
    expect(screen.getByRole("button", { name: "Buscar hotéis" })).toHaveFocus();
    vi.restoreAllMocks();
  });

  it("datas futuras: preenche o formulário inteiro, foca 'Buscar hotéis' e anuncia", async () => {
    const user = userEvent.setup();
    const item = make({ destination: "Gramado, RS", rooms: 2, adults: 3, children: 1 });
    seed([item]);
    render();
    await user.click(await screen.findByRole("button", { name: /Gramado, RS/ }));
    expect(screen.getByRole("combobox", { name: /Destino/ })).toHaveValue("Gramado, RS");
    expect(screen.getByLabelText(/Check-in/)).toHaveValue(item.checkIn);
    expect(screen.getByLabelText(/Check-out/)).toHaveValue(item.checkOut);
    expect(screen.getByRole("group", { name: "Quartos" })).toHaveTextContent("2");
    expect(screen.getByRole("button", { name: "Buscar hotéis" })).toHaveFocus();
    expect(
      await screen.findByText("Busca preenchida: Gramado, RS. Confira e busque hotéis."),
    ).toBeInTheDocument();
  });

  it("check-in passado: mantém destino e hóspedes, esvazia datas, foca o check-in e avisa", async () => {
    const user = userEvent.setup();
    seed([make({ checkIn: addDays(TODAY, -5), checkOut: addDays(TODAY, -2), adults: 3 })]);
    render();
    const item = await screen.findByRole("button", { name: /datas passadas$/ });
    expect(screen.getByText("Datas passadas")).toBeInTheDocument();
    await user.click(item);
    expect(screen.getByRole("combobox", { name: /Destino/ })).toHaveValue("São Paulo, SP");
    expect(screen.getByRole("group", { name: "Adultos" })).toHaveTextContent("3");
    expect(screen.getByLabelText(/Check-in/)).toHaveValue("");
    expect(screen.getByLabelText(/Check-out/)).toHaveValue("");
    await waitFor(() => expect(screen.getByLabelText(/Check-in/)).toHaveFocus());
    const notice = "As datas dessa busca já passaram. Escolha novas datas.";
    expect(screen.getByLabelText(/Check-in/)).toHaveAccessibleDescription(notice);
    await waitFor(() => expect(screen.getAllByText(notice)).toHaveLength(2));
  });

  it("'Limpar buscas recentes' esvazia lista e storage, foca o botão de buscar e avisa", async () => {
    const user = userEvent.setup();
    seed([make()]);
    render();
    await user.click(await screen.findByRole("button", { name: "Limpar buscas recentes" }));
    expect(screen.queryByRole("heading", { name: "Buscas recentes" })).not.toBeInTheDocument();
    expect(localStorage.getItem(KEY)).toBeNull();
    expect(screen.getByRole("button", { name: "Buscar hotéis" })).toHaveFocus();
    expect(await screen.findByText("Buscas recentes apagadas.")).toBeInTheDocument();
  });

  it("storage corrompido ou itens inválidos não quebram a página", async () => {
    localStorage.setItem(KEY, "{quebrado");
    const { unmount } = render();
    expect(screen.getByRole("button", { name: "Buscar hotéis" })).toBeInTheDocument();
    unmount();
    seed([{ lixo: true }, make()]);
    render();
    await waitFor(() => expect(screen.getAllByRole("listitem")).toHaveLength(1));
  });

  it("storage que lança não quebra a página", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    render();
    expect(screen.getByRole("button", { name: "Buscar hotéis" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Buscas recentes" })).not.toBeInTheDocument();
  });
});
