import { onlineManager } from "@tanstack/react-query";
import { act, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { afterEach, beforeEach, describe, expect, it, type MockInstance, vi } from "vitest";
import { renderWithProviders } from "@/shared/testing/render";
import { DestinationCombobox } from "./DestinationCombobox";

const SUGGESTIONS = [
  {
    id: 1,
    name: "Rio de Janeiro, RJ",
    type: "city",
    country: "Brasil",
    searchName: "rio de janeiro, rj",
  },
  { id: 2, name: "São Paulo, SP", type: "city", country: "Brasil", searchName: "sao paulo, sp" },
  {
    id: 3,
    name: "Florianópolis, SC",
    type: "city",
    country: "Brasil",
    searchName: "florianopolis, sc",
  },
  {
    id: 4,
    name: "Ilha Grande, RJ",
    type: "island",
    country: "Brasil",
    searchName: "ilha grande, rj",
  },
  {
    id: 5,
    name: "Flor de Lis, SC",
    type: "nature",
    country: "Brasil",
    searchName: "flor de lis, sc",
  },
];

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

const fetchMock = vi.fn<typeof fetch>();

const respondWithSeed = async (input: RequestInfo | URL) => {
  const q = new URL(String(input)).searchParams.get("q") ?? "";
  return json(SUGGESTIONS.filter((s) => s.searchName.includes(q)));
};

const onChange = vi.fn<(name: string) => void>();

const Harness = () => {
  const [value, setValue] = useState("");
  return (
    <>
      <DestinationCombobox
        value={value}
        onChange={(name) => {
          onChange(name);
          setValue(name);
        }}
        onBlur={() => undefined}
      />
      <button type="button">depois</button>
    </>
  );
};

const setup = () => {
  const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
  renderWithProviders(<Harness />);
  return { user, input: screen.getByRole("combobox", { name: /Destino/ }) };
};

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true });
  fetchMock.mockImplementation(respondWithSeed);
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  fetchMock.mockReset();
  onChange.mockReset();
});

describe("DestinationCombobox: busca", () => {
  it("1 caractere não faz request e mantém o popover fechado", async () => {
    const { user, input } = setup();
    await user.type(input, "f");
    await vi.advanceTimersByTimeAsync(500);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(input).toHaveAttribute("aria-expanded", "false");
  });

  it("digitar rápido faz um request 300 ms depois e realça o trecho", async () => {
    const { user, input } = setup();
    await user.type(input, "flor");
    expect(fetchMock).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(300);
    const option = await screen.findByRole("option", { name: /Florianópolis, SC/ });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(String(fetchMock.mock.calls[0]?.[0])).toContain("/suggestions?q=flor");
    expect(option.querySelector("mark")).toHaveTextContent("Flor");
    expect(option).toHaveAccessibleName(/Florianópolis, SC,\s?Cidade/);
  });

  it("ignora acento: 'sao' acha São Paulo e 'São' usa a mesma chave", async () => {
    const { user, input } = setup();
    await user.type(input, "São");
    await vi.advanceTimersByTimeAsync(300);
    expect(await screen.findByRole("option", { name: /São Paulo, SP/ })).toBeInTheDocument();
    expect(String(fetchMock.mock.calls[0]?.[0])).toContain("q=sao");
  });

  it("anuncia a contagem em região polite", async () => {
    const { user, input } = setup();
    await user.type(input, "flor");
    await vi.advanceTimersByTimeAsync(300);
    const live = await screen.findByText("2 destinos encontrados");
    expect(live).toHaveAttribute("aria-live", "polite");
    await user.clear(input);
    await user.type(input, "florian");
    await vi.advanceTimersByTimeAsync(300);
    expect(await screen.findByText("1 destino encontrado")).toBeInTheDocument();
  });

  it("sem resultados mostra a linha vazia e anuncia", async () => {
    const { user, input } = setup();
    await user.type(input, "xyz");
    await vi.advanceTimersByTimeAsync(300);
    const matches = await screen.findAllByText('Nenhum destino encontrado para "xyz"');
    expect(matches).toHaveLength(2);
    expect(screen.queryByRole("option")).not.toBeInTheDocument();
  });
});

describe("DestinationCombobox: carregando", () => {
  it("sem resultados anteriores mostra spinner e 'Buscando destinos…'", async () => {
    fetchMock.mockImplementation(() => new Promise(() => undefined));
    const { user, input } = setup();
    await user.type(input, "flor");
    await vi.advanceTimersByTimeAsync(300);
    expect(
      await screen.findByText("Buscando destinos…", { selector: "p:not(.sr-only)" }),
    ).toBeVisible();
  });

  it("com resultados anteriores eles continuam visíveis", async () => {
    const { user, input } = setup();
    await user.type(input, "flor");
    await vi.advanceTimersByTimeAsync(300);
    await screen.findByRole("option", { name: /Florianópolis/ });
    fetchMock.mockImplementation(() => new Promise(() => undefined));
    await user.type(input, "i");
    await vi.advanceTimersByTimeAsync(300);
    expect(screen.getByRole("option", { name: /Florianópolis/ })).toBeVisible();
    expect(screen.queryByText("Buscando destinos…", { selector: "p:not(.sr-only)" })).toBeNull();
  });
});

describe("DestinationCombobox: erro", () => {
  it("mostra a mensagem e refaz o request em 'Tentar de novo'", async () => {
    fetchMock.mockImplementationOnce(async () => json({ error: "boom" }, 500));
    const { user, input } = setup();
    await user.type(input, "flor");
    await vi.advanceTimersByTimeAsync(300);
    expect(await screen.findAllByText("Não foi possível carregar os destinos.")).toHaveLength(2);
    await user.click(screen.getByRole("button", { name: "Tentar de novo" }));
    expect(await screen.findByRole("option", { name: /Florianópolis/ })).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("Tab no erro vai para 'Tentar de novo' sem fechar; sair do wrapper fecha", async () => {
    fetchMock.mockImplementation(async () => json({ error: "boom" }, 500));
    const { user, input } = setup();
    await user.type(input, "flor");
    await vi.advanceTimersByTimeAsync(300);
    await screen.findByRole("button", { name: "Tentar de novo" });
    await user.tab(); // Limpar destino
    await user.tab(); // Tentar de novo
    expect(screen.getByRole("button", { name: "Tentar de novo" })).toHaveFocus();
    expect(input).toHaveAttribute("aria-expanded", "true");
    await user.tab();
    expect(screen.getByRole("button", { name: "depois" })).toHaveFocus();
    expect(input).toHaveAttribute("aria-expanded", "false");
  });
});

describe("DestinationCombobox: offline e lista de outra busca", () => {
  let onLine: MockInstance<() => boolean>;

  beforeEach(() => {
    onLine = vi.spyOn(window.navigator, "onLine", "get");
  });

  afterEach(() => {
    onLine.mockRestore();
    onlineManager.setOnline(true);
  });

  const goOffline = () => {
    onLine.mockReturnValue(false);
    onlineManager.setOnline(false);
    window.dispatchEvent(new Event("offline"));
  };

  it("offline mostra a linha offline e não exibe a lista de outra busca", async () => {
    const { user, input } = setup();
    await user.type(input, "flor");
    await vi.advanceTimersByTimeAsync(300);
    await screen.findAllByRole("option");

    fetchMock.mockImplementation(() => new Promise(() => undefined));
    act(goOffline);
    await user.type(input, "i");
    await vi.advanceTimersByTimeAsync(300);

    expect(screen.queryByRole("option")).toBeNull();
    expect((await screen.findAllByText(/Você está sem internet/)).length).toBeGreaterThan(0);
    expect(screen.queryByText("Buscando destinos…", { selector: "p:not(.sr-only)" })).toBeNull();
  });

  it("↓ e Enter não ativam opções enquanto a lista é de outra busca (placeholder)", async () => {
    const { user, input } = setup();
    await user.type(input, "flor");
    await vi.advanceTimersByTimeAsync(300);
    await screen.findAllByRole("option");

    fetchMock.mockImplementation(() => new Promise(() => undefined));
    await user.type(input, "i");
    await vi.advanceTimersByTimeAsync(300);
    expect(screen.getAllByRole("option").length).toBeGreaterThan(0); // placeholder visível

    await user.keyboard("{ArrowDown}");
    expect(input).not.toHaveAttribute("aria-activedescendant");
    await user.keyboard("{Enter}");
    expect(onChange).not.toHaveBeenCalledWith(expect.stringContaining("Flor"));
  });

  it("trocar as opções (mesmo com a mesma quantidade) zera a opção ativa", async () => {
    const { user, input } = setup();
    await user.type(input, "ri");
    await vi.advanceTimersByTimeAsync(300);
    await screen.findAllByRole("option");
    await user.keyboard("{ArrowDown}");
    expect(input).toHaveAttribute("aria-activedescendant");

    await user.type(input, "o");
    await vi.advanceTimersByTimeAsync(300);
    await screen.findAllByRole("option");
    expect(input).not.toHaveAttribute("aria-activedescendant");
  });
});

describe("DestinationCombobox: ARIA e teclado", () => {
  const openWithResults = async () => {
    const ctx = setup();
    await ctx.user.type(ctx.input, "flor");
    await vi.advanceTimersByTimeAsync(300);
    await screen.findByRole("option", { name: /Florianópolis/ });
    return ctx;
  };

  it("expõe os atributos do padrão combobox 1.2", async () => {
    const { input } = await openWithResults();
    const listbox = screen.getByRole("listbox", { name: "Destinos sugeridos" });
    expect(input).toHaveAttribute("aria-autocomplete", "list");
    expect(input).toHaveAttribute("aria-expanded", "true");
    expect(input).toHaveAttribute("aria-controls", listbox.id);
    expect(input).not.toHaveAttribute("aria-activedescendant");
    expect(screen.getAllByRole("option")).toHaveLength(2);
  });

  it("↓ ativa a primeira, circula, ↑ volta; aria-activedescendant e aria-selected acompanham", async () => {
    const { user, input } = await openWithResults();
    const [first, second] = screen.getAllByRole("option");
    await user.keyboard("{ArrowDown}");
    expect(input).toHaveAttribute("aria-activedescendant", first?.id);
    expect(first).toHaveAttribute("aria-selected", "true");
    await user.keyboard("{ArrowDown}");
    expect(input).toHaveAttribute("aria-activedescendant", second?.id);
    await user.keyboard("{ArrowDown}");
    expect(input).toHaveAttribute("aria-activedescendant", first?.id);
    await user.keyboard("{ArrowUp}");
    expect(input).toHaveAttribute("aria-activedescendant", second?.id);
    expect(first).toHaveAttribute("aria-selected", "false");
  });

  it("Enter na opção ativa seleciona sem submeter; foco fica no input", async () => {
    const { user, input } = await openWithResults();
    await user.keyboard("{ArrowDown}{Enter}");
    expect(input).toHaveValue("Florianópolis, SC");
    expect(onChange).toHaveBeenLastCalledWith("Florianópolis, SC");
    expect(input).toHaveAttribute("aria-expanded", "false");
    expect(input).toHaveFocus();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("Esc fecha; o segundo Esc limpa o texto", async () => {
    const { user, input } = await openWithResults();
    await user.keyboard("{Escape}");
    expect(input).toHaveAttribute("aria-expanded", "false");
    expect(input).toHaveValue("flor");
    await user.keyboard("{Escape}");
    expect(input).toHaveValue("");
  });

  it("Tab fecha sem selecionar", async () => {
    const { user, input } = await openWithResults();
    await user.keyboard("{ArrowDown}");
    await user.tab();
    expect(input).toHaveAttribute("aria-expanded", "false");
    expect(onChange).not.toHaveBeenCalledWith(expect.stringContaining(","));
  });

  it("↓ reabre o popover fechado", async () => {
    const { user, input } = await openWithResults();
    await user.keyboard("{Escape}");
    await user.keyboard("{ArrowDown}");
    expect(input).toHaveAttribute("aria-expanded", "true");
  });

  it("clique seleciona e clique fora fecha", async () => {
    const { user, input } = await openWithResults();
    await user.click(screen.getByRole("option", { name: /Florianópolis/ }));
    expect(input).toHaveValue("Florianópolis, SC");
    expect(onChange).toHaveBeenLastCalledWith("Florianópolis, SC");
    await user.clear(input);
    await user.type(input, "flor");
    await vi.advanceTimersByTimeAsync(300);
    await screen.findByRole("option", { name: /Florianópolis/ });
    await user.click(document.body);
    await waitFor(() => expect(input).toHaveAttribute("aria-expanded", "false"));
  });

  it("editar depois de selecionar desfaz a seleção", async () => {
    const { user, input } = await openWithResults();
    await user.click(screen.getByRole("option", { name: /Florianópolis/ }));
    await user.type(input, "x");
    expect(onChange).toHaveBeenLastCalledWith("");
  });
});

describe("DestinationCombobox: limpar", () => {
  it("limpa texto e seleção e devolve o foco ao input", async () => {
    const { user, input } = setup();
    expect(screen.queryByRole("button", { name: "Limpar destino" })).not.toBeInTheDocument();
    await user.type(input, "flor");
    await vi.advanceTimersByTimeAsync(300);
    await screen.findByRole("option", { name: /Florianópolis/ });
    await user.click(screen.getByRole("option", { name: /Florianópolis/ }));
    await user.click(screen.getByRole("button", { name: "Limpar destino" }));
    expect(input).toHaveValue("");
    expect(input).toHaveFocus();
    expect(onChange).toHaveBeenLastCalledWith("");
    expect(screen.queryByRole("button", { name: "Limpar destino" })).not.toBeInTheDocument();
  });
});
