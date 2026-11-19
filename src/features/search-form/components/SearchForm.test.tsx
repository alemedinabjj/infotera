import { fireEvent, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { addDays, todayISO } from "@/shared/lib/dates";
import { renderWithProviders } from "@/shared/testing/render";
import { SearchForm } from "./SearchForm";

const push = vi.fn<(url: string) => void>();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));

const SAO_PAULO = {
  id: 2,
  name: "São Paulo, SP",
  type: "city",
  country: "Brasil",
  searchName: "sao paulo, sp",
};

beforeEach(() => {
  localStorage.clear();
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => new Response(JSON.stringify([SAO_PAULO]), { status: 200 })),
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
  push.mockReset();
});

const destinationInput = () => screen.getByRole("combobox", { name: /Destino/ });
const submitButton = () => screen.getByRole("button", { name: "Buscar hotéis" });

const chooseDestination = async (user: ReturnType<typeof userEvent.setup>) => {
  await user.type(destinationInput(), "sao");
  await user.click(await screen.findByRole("option", { name: /São Paulo, SP/ }, { timeout: 2000 }));
};

const fillDates = (checkIn: string, checkOut: string) => {
  fireEvent.change(screen.getByLabelText(/Check-in/), { target: { value: checkIn } });
  fireEvent.change(screen.getByLabelText(/Check-out/), { target: { value: checkOut } });
};

describe("SearchForm: envio inválido", () => {
  it("foca o primeiro campo inválido, marca os erros e mostra o resumo", async () => {
    const user = userEvent.setup();
    renderWithProviders(<SearchForm />);
    await user.click(submitButton());
    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("Corrija 3 campos para continuar");
    expect(destinationInput()).toHaveFocus();
    for (const input of [destinationInput(), screen.getByLabelText(/Check-in/)]) {
      expect(input).toHaveAttribute("aria-invalid", "true");
      expect(input).toHaveAccessibleDescription(/\S/);
    }
    expect(submitButton()).not.toHaveAttribute("aria-disabled", "true");
    expect(push).not.toHaveBeenCalled();
  });

  it("clicar num item do resumo foca o campo", async () => {
    const user = userEvent.setup();
    renderWithProviders(<SearchForm />);
    await user.click(submitButton());
    await user.click(await screen.findByRole("button", { name: /Check-out: Escolha a data/ }));
    expect(screen.getByLabelText(/Check-out/)).toHaveFocus();
  });

  it("o resumo acompanha as correções", async () => {
    const user = userEvent.setup();
    renderWithProviders(<SearchForm />);
    await user.click(submitButton());
    await screen.findByRole("alert");
    fillDates(addDays(todayISO(), 3), addDays(todayISO(), 5));
    await waitFor(() =>
      expect(screen.getByRole("alert")).toHaveTextContent("Corrija 1 campo para continuar"),
    );
  });

  it("texto digitado sem escolher da lista bloqueia o envio", async () => {
    const user = userEvent.setup();
    renderWithProviders(<SearchForm />);
    fillDates(addDays(todayISO(), 3), addDays(todayISO(), 5));
    await user.type(destinationInput(), "sao");
    await user.click(submitButton());
    expect(await screen.findAllByText("Escolha um destino da lista.")).not.toHaveLength(0);
    expect(push).not.toHaveBeenCalled();
  });
});

describe("SearchForm: envio válido", () => {
  it("navega para /search com a URL na ordem certa e salva nas recentes", async () => {
    const user = userEvent.setup();
    renderWithProviders(<SearchForm />);
    await chooseDestination(user);
    const checkIn = addDays(todayISO(), 7);
    const checkOut = addDays(todayISO(), 10);
    fillDates(checkIn, checkOut);
    await user.click(screen.getByRole("button", { name: "Aumentar crianças" }));
    await user.click(submitButton());
    await waitFor(() => expect(push).toHaveBeenCalledTimes(1));
    expect(push).toHaveBeenCalledWith(
      `/search?destination=S%C3%A3o+Paulo%2C+SP&checkIn=${checkIn}&checkOut=${checkOut}&rooms=1&adults=2&children=1`,
    );
    const saved: unknown = JSON.parse(localStorage.getItem("infotera:recent-searches") ?? "[]");
    expect(saved).toEqual([
      {
        destination: "São Paulo, SP",
        checkIn,
        checkOut,
        rooms: 1,
        adults: 2,
        children: 1,
      },
    ]);
  });

  it("Enter no destino sem opção ativa envia o formulário", async () => {
    const user = userEvent.setup();
    renderWithProviders(<SearchForm />);
    await user.click(destinationInput());
    await user.keyboard("{Enter}");
    expect(await screen.findByRole("alert")).toBeInTheDocument();
  });
});

describe("SearchForm: initialCriteria", () => {
  it("preenche tudo e trata o destino como escolhido", async () => {
    const user = userEvent.setup();
    const checkIn = addDays(todayISO(), 4);
    const checkOut = addDays(todayISO(), 6);
    renderWithProviders(
      <SearchForm
        initialCriteria={{
          destination: "Gramado, RS",
          checkIn,
          checkOut,
          rooms: 2,
          adults: 3,
          children: 1,
        }}
      />,
    );
    expect(destinationInput()).toHaveValue("Gramado, RS");
    expect(screen.getByLabelText(/Check-in/)).toHaveValue(checkIn);
    expect(screen.getByLabelText(/Check-out/)).toHaveValue(checkOut);
    expect(screen.getByRole("group", { name: "Adultos" })).toHaveTextContent("3");
    expect(screen.getByRole("group", { name: "Quartos" })).toHaveTextContent("2");
    await user.click(submitButton());
    await waitFor(() => expect(push).toHaveBeenCalledTimes(1));
    expect(push.mock.calls[0]?.[0]).toContain("destination=Gramado%2C+RS");
  });
});

describe("SearchForm: initialCriteria parcial e buscas recentes", () => {
  it("só destino: destino escolhido, datas vazias e hóspedes padrão", () => {
    renderWithProviders(<SearchForm initialCriteria={{ destination: "Bonito, MS" }} />);
    expect(destinationInput()).toHaveValue("Bonito, MS");
    expect(screen.getByLabelText(/Check-in/)).toHaveValue("");
    expect(screen.getByLabelText(/Check-out/)).toHaveValue("");
    expect(screen.getByRole("group", { name: "Adultos" })).toHaveTextContent("2");
    expect(screen.getByRole("group", { name: "Quartos" })).toHaveTextContent("1");
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
  });

  it("showRecentSearches={false} esconde a lista de recentes", () => {
    localStorage.setItem(
      "infotera:recent-searches",
      JSON.stringify([
        {
          destination: "Gramado, RS",
          checkIn: addDays(todayISO(), 4),
          checkOut: addDays(todayISO(), 6),
          rooms: 1,
          adults: 2,
          children: 0,
        },
      ]),
    );
    const { unmount } = renderWithProviders(<SearchForm />);
    expect(screen.getByRole("heading", { name: "Buscas recentes" })).toBeInTheDocument();
    unmount();
    renderWithProviders(<SearchForm showRecentSearches={false} />);
    expect(screen.queryByRole("heading", { name: "Buscas recentes" })).not.toBeInTheDocument();
  });
});

describe("SearchForm: clique em botão com o destino digitado e não escolhido", () => {
  const DESTINATION_ERROR = "Escolha um destino da lista.";
  const KEY = "infotera:recent-searches";

  it("o erro do blur espera o clique: o 1º clique em 'Buscar hotéis' mostra o resumo", async () => {
    const user = userEvent.setup();
    renderWithProviders(<SearchForm />);
    await user.type(destinationInput(), "flor");
    await user.pointer({ keys: "[MouseLeft>]", target: submitButton() });
    // O foco já saiu do campo, mas o erro (que empurraria o botão) ainda não apareceu.
    expect(destinationInput()).not.toHaveFocus();
    expect(screen.queryByText(DESTINATION_ERROR)).not.toBeInTheDocument();

    await user.pointer({ keys: "[/MouseLeft]", target: submitButton() });
    expect(await screen.findByRole("alert")).toHaveTextContent("Corrija");
    expect(screen.getAllByText(DESTINATION_ERROR).length).toBeGreaterThan(0);
    expect(push).not.toHaveBeenCalled();
  });

  it("soltar fora do botão não perde a validação do blur", async () => {
    const user = userEvent.setup();
    renderWithProviders(<SearchForm />);
    await user.type(destinationInput(), "flor");
    await user.pointer({ keys: "[MouseLeft>]", target: submitButton() });
    await user.pointer({ keys: "[/MouseLeft]", target: document.body });
    expect(await screen.findByText(DESTINATION_ERROR, {}, { timeout: 2000 })).toBeInTheDocument();
  });

  it("buscas recentes: o 1º clique em outro item preenche o formulário", async () => {
    const make = (destination: string) => ({
      destination,
      checkIn: addDays(todayISO(), 10),
      checkOut: addDays(todayISO(), 12),
      rooms: 1,
      adults: 2,
      children: 0,
    });
    localStorage.setItem(KEY, JSON.stringify([make("Gramado, RS"), make("Natal, RN")]));
    const user = userEvent.setup();
    renderWithProviders(<SearchForm />);
    await user.type(destinationInput(), "flor");
    const item = await screen.findByRole("button", { name: /Natal, RN/ });
    await user.pointer({ keys: "[MouseLeft>]", target: item });
    expect(screen.queryByText(DESTINATION_ERROR)).not.toBeInTheDocument();
    await user.pointer({ keys: "[/MouseLeft]", target: item });
    await waitFor(() => expect(destinationInput()).toHaveValue("Natal, RN"));
    expect(screen.queryByText(DESTINATION_ERROR)).not.toBeInTheDocument();
  });

  it("'Limpar destino': mousedown não tira o foco e nenhum erro aparece", async () => {
    const user = userEvent.setup();
    renderWithProviders(<SearchForm />);
    await user.type(destinationInput(), "flor");
    const clear = await screen.findByRole("button", { name: "Limpar destino" }, { timeout: 2000 });
    // Safari/iOS/Firefox mac não focam o botão no clique: sem preventDefault o input perderia o
    // foco (blur com relatedTarget nulo) e o erro apareceria. Com ele, o foco nem sai do campo.
    expect(fireEvent.mouseDown(clear)).toBe(false);
    await user.click(clear);
    expect(destinationInput()).toHaveValue("");
    expect(destinationInput()).toHaveFocus();
    expect(screen.queryByText(DESTINATION_ERROR)).not.toBeInTheDocument();
  });
});
