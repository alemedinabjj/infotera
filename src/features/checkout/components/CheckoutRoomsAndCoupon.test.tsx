import { act, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useBookingDraft } from "@/shared/stores/booking-draft";
import { makeHotel, makeRoom } from "@/shared/testing/fixtures";
import { navigationSpies } from "@/shared/testing/next-navigation";
import {
  jsonResponse,
  makeSelection,
  plain,
  renderCheckout,
  seedSelection,
  stubApi,
  stubLoadedDocument,
} from "./checkout-test-utils";

vi.mock(
  "next/navigation",
  async () => (await import("@/shared/testing/next-navigation")).navigationMock,
);
vi.mock("../api/create-booking.action", () => ({ createBookingAction: vi.fn() }));

beforeEach(() => {
  navigationSpies.replace.mockClear();
  stubLoadedDocument();
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

const total = () => plain(screen.getByRole("region", { name: "Sua reserva" }).textContent);
const plus = () => screen.getByRole("button", { name: "Adicionar quarto" });
const minus = () => screen.getByRole("button", { name: "Remover quarto" });

/** `/rooms/1` controlável: a 1ª leitura é imediata; as seguintes esperam `release`. */
const controlledRoom = (room = makeRoom()) => {
  let release: (body?: unknown) => void = () => undefined;
  let calls = 0;
  stubApi({
    "/hotels/1": makeHotel(),
    "/rooms/1": () => {
      calls += 1;
      if (calls === 1) return jsonResponse(room);
      return new Promise<Response>((resolve) => {
        release = (body = room) => resolve(jsonResponse(body));
      });
    },
  });
  return { release: (body?: unknown) => release(body) };
};

describe("quartos otimistas (critérios 11–13)", () => {
  it("aumentar para 2: o total muda antes da API e 'Confirmando disponibilidade…' some ao confirmar", async () => {
    const user = userEvent.setup();
    await seedSelection(makeSelection({ adults: 2 }));
    const api = controlledRoom();
    renderCheckout();
    await screen.findByText("Hotel Copacabana Palace");
    await user.click(plus());
    expect(total()).toContain("TotalR$ 8.280,00");
    expect(screen.getByText("Confirmando disponibilidade…")).toBeVisible();
    await act(async () => api.release());
    await waitFor(() =>
      expect(screen.queryByText("Confirmando disponibilidade…")).not.toBeInTheDocument(),
    );
    expect(total()).toContain("TotalR$ 8.280,00");
    expect(useBookingDraft.getState().selection?.criteria.rooms).toBe(2);
  });

  it("API devolve available 1: volta para 1 quarto com o motivo", async () => {
    const user = userEvent.setup();
    await seedSelection(makeSelection({ adults: 2 }));
    const api = controlledRoom();
    renderCheckout();
    await screen.findByText("Hotel Copacabana Palace");
    await user.click(plus());
    await act(async () => api.release(makeRoom({ available: 1 })));
    expect(await screen.findByText("Só 1 quarto disponível.")).toBeVisible();
    expect(total()).toContain("TotalR$ 4.140,00");
    expect(screen.getByText("1", { selector: "output" })).toBeVisible();
    expect(useBookingDraft.getState().selection?.criteria.rooms).toBe(1);
  });

  it("falha de rede na confirmação: volta e avisa", async () => {
    const user = userEvent.setup();
    await seedSelection(makeSelection({ adults: 2 }));
    let calls = 0;
    stubApi({
      "/hotels/1": makeHotel(),
      "/rooms/1": () => {
        calls += 1;
        if (calls === 1) return jsonResponse(makeRoom());
        throw new TypeError("rede");
      },
    });
    renderCheckout();
    await screen.findByText("Hotel Copacabana Palace");
    await user.click(plus());
    expect(
      await screen.findByText("Não foi possível confirmar a disponibilidade. Tente de novo."),
    ).toBeVisible();
    expect(total()).toContain("TotalR$ 4.140,00");
  });

  it("limites com o motivo, aria-disabled e foco mantido", async () => {
    const user = userEvent.setup();
    await seedSelection(makeSelection({ adults: 2 }));
    const api = controlledRoom();
    renderCheckout();
    await screen.findByText("Hotel Copacabana Palace");
    await user.click(plus());
    await act(async () => api.release());
    await waitFor(() => expect(plus()).toHaveAttribute("aria-disabled", "true"));
    expect(screen.getByText("Cada quarto precisa de pelo menos 1 adulto.")).toBeVisible();
    plus().focus();
    await user.click(plus());
    expect(plus()).toHaveFocus();
    expect(total()).toContain("TotalR$ 8.280,00");
  });

  it("4 adultos num quarto de 3: o '−' fica no mínimo (2) com o motivo", async () => {
    await seedSelection(makeSelection({ adults: 4, rooms: 2 }));
    stubApi({ "/hotels/1": makeHotel(), "/rooms/1": makeRoom({ maxGuests: 3 }) });
    renderCheckout();
    await screen.findByText("Hotel Copacabana Palace");
    expect(minus()).toHaveAttribute("aria-disabled", "true");
    expect(
      screen.getByText(
        "Este quarto acomoda até 3 hóspedes: 4 hóspedes precisam de pelo menos 2 quartos.",
      ),
    ).toBeVisible();
  });

  it("cliques rápidos: o último vence e o rollback vai ao último confirmado", async () => {
    const user = userEvent.setup();
    await seedSelection(makeSelection({ adults: 3 }));
    const pending: ((body: unknown) => void)[] = [];
    let calls = 0;
    stubApi({
      "/hotels/1": makeHotel(),
      "/rooms/1": () => {
        calls += 1;
        if (calls === 1) return jsonResponse(makeRoom());
        return new Promise<Response>((resolve) => {
          pending.push((body) => resolve(jsonResponse(body)));
        });
      },
    });
    renderCheckout();
    await screen.findByText("Hotel Copacabana Palace");
    await user.click(plus()); // 2
    await user.click(plus()); // 3
    expect(total()).toContain("TotalR$ 12.420,00");
    // As duas confirmações compartilham a mesma consulta em andamento: com 2 disponíveis o pedido
    // de 2 quartos confirma e o de 3 é negado; o valor volta ao último confirmado (2).
    await act(async () => pending[0]?.(makeRoom({ available: 2 })));
    expect(await screen.findByText("Só 2 quartos disponíveis.")).toBeVisible();
    expect(total()).toContain("TotalR$ 8.280,00");
  });
});

describe("cupom (critérios 14–18)", () => {
  const openCoupon = async (user: ReturnType<typeof userEvent.setup>) => {
    await screen.findByText("Hotel Copacabana Palace");
    await user.click(screen.getByRole("button", { name: "Tenho um cupom de desconto" }));
  };
  const apply = async (user: ReturnType<typeof userEvent.setup>, code: string) => {
    const input = screen.getByLabelText("Cupom de desconto");
    await user.clear(input);
    await user.type(input, code);
    await user.click(screen.getByRole("button", { name: /Aplicar\s*cupom/ }));
  };

  beforeEach(async () => {
    await seedSelection(makeSelection({ adults: 2 }));
    stubApi({ "/hotels/1": makeHotel(), "/rooms/1": makeRoom() });
  });

  it("formato inválido: erro na hora, sem 'Aplicando…' e sem consulta pendente", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    renderCheckout();
    await openCoupon(user);
    await apply(user, "bem vindo10");
    expect(screen.getAllByText("Use de 4 a 12 letras ou números, sem espaços.")[0]).toBeVisible();
    expect(screen.queryByRole("button", { name: "Aplicando…" })).not.toBeInTheDocument();
    expect(vi.getTimerCount()).toBe(0);
  });

  it("aplica BEMVINDO10: 'Aplicando…', depois desconto, total e foco em 'Remover cupom'", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    renderCheckout();
    await openCoupon(user);
    await apply(user, "bemvindo10");
    expect(screen.getByRole("button", { name: "Aplicando…" })).toBeVisible();
    await act(async () => vi.advanceTimersByTimeAsync(700));
    expect(await screen.findByText("BEMVINDO10 · 10% de desconto")).toBeVisible();
    expect(total()).toContain("Desconto (BEMVINDO10)−R$ 360,00");
    expect(total()).toContain("TotalR$ 3.726,00");
    expect(screen.getByRole("button", { name: /Remover\s*cupom/ })).toHaveFocus();
    expect(screen.getByText("Cupom BEMVINDO10 aplicado.", { exact: false })).toBeInTheDocument();
  });

  it("reaplicar o mesmo código usa o cache: sem 'Aplicando…' e sem timer", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    renderCheckout();
    await openCoupon(user);
    await apply(user, "BEMVINDO10");
    await act(async () => vi.advanceTimersByTimeAsync(700));
    await user.click(await screen.findByRole("button", { name: /Remover\s*cupom/ }));
    expect(screen.getByLabelText("Cupom de desconto")).toHaveFocus();
    await apply(user, "BEMVINDO10");
    expect(screen.queryByRole("button", { name: "Aplicando…" })).not.toBeInTheDocument();
    expect(await screen.findByRole("button", { name: /Remover\s*cupom/ })).toBeVisible();
    // Só sobra o debounce do rascunho (grava o código do cupom); a consulta do cupom não agenda timer.
    await act(async () => vi.advanceTimersByTimeAsync(600));
    expect(vi.getTimerCount()).toBe(0);
  });

  it.each([
    ["NAOEXISTE", "Cupom não encontrado. Confira o código."],
    ["VERAO2024", "Este cupom expirou."],
  ])("%s é recusado e o total não muda", async (code, message) => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    renderCheckout();
    await openCoupon(user);
    await apply(user, code);
    await act(async () => vi.advanceTimersByTimeAsync(700));
    expect((await screen.findAllByText(message))[0]).toBeVisible();
    expect(total()).toContain("TotalR$ 4.140,00");
  });

  it("trocar o texto durante a consulta a cancela", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    renderCheckout();
    await openCoupon(user);
    await apply(user, "BEMVINDO10");
    expect(screen.getByRole("button", { name: "Aplicando…" })).toBeVisible();
    await user.type(screen.getByLabelText("Cupom de desconto"), "X");
    expect(screen.queryByRole("button", { name: "Aplicando…" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Aplicar\s*cupom/ })).toBeVisible();
    expect(total()).toContain("TotalR$ 4.140,00");
  });
});
