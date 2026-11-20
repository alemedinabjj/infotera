import { act, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  clickButton,
  fillCard,
  fillHolder,
  happyApi,
  makeSelection,
  renderCheckout,
  seedSelection,
  stubLoadedDocument,
} from "./checkout-test-utils";

vi.mock(
  "next/navigation",
  async () => (await import("@/shared/testing/next-navigation")).navigationMock,
);
vi.mock("../api/create-booking.action", () => ({ createBookingAction: vi.fn() }));

const KEY = "infotera:checkout-draft";

beforeEach(async () => {
  stubLoadedDocument();
  happyApi();
  await seedSelection(makeSelection());
  vi.useFakeTimers({ shouldAdvanceTime: true });
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

const nth = (items: HTMLElement[]): HTMLElement => {
  const [item] = items;
  if (!item) throw new Error("elemento não encontrado");
  return item;
};

const setup = () => userEvent.setup({ advanceTimers: vi.advanceTimersByTime });

describe("rascunho (critérios 33–35)", () => {
  it("nada antes de 500 ms; depois grava contato e passo, sem dados de pagamento", async () => {
    const user = setup();
    renderCheckout();
    await fillHolder(user);
    await clickButton(user, "Continuar para pagamento");
    await fillCard(user);
    expect(sessionStorage.getItem(KEY)).toBeNull();
    await act(async () => vi.advanceTimersByTimeAsync(600));
    const draft = sessionStorage.getItem(KEY) ?? "";
    expect(JSON.parse(draft)).toMatchObject({
      v: 1,
      step: "payment",
      contact: { firstName: "Ana", email: "ana@exemplo.com", phoneCountry: "BR" },
    });
    for (const secret of ["4111", "ANA SOUZA", "52998224725", "12/30", '123"']) {
      expect(draft).not.toContain(secret);
    }
  });

  it("recarregar no passo 2: volta no passo 2 com o 1 preenchido, pagamento vazio e aviso", async () => {
    const user = setup();
    const first = renderCheckout();
    await fillHolder(user);
    await clickButton(user, "Continuar para pagamento");
    await fillCard(user);
    await act(async () => vi.advanceTimersByTimeAsync(600));
    first.unmount();

    renderCheckout();
    expect(await screen.findByRole("heading", { level: 2, name: "Pagamento" })).toBeVisible();
    expect(screen.getByLabelText("Número do cartão")).toHaveValue("");
    expect(
      screen.getByText(
        "Por segurança, os dados do cartão não ficam salvos. Preencha o pagamento de novo.",
      ),
    ).toBeVisible();
    await clickButton(user, "Voltar");
    expect(screen.getByLabelText("Nome")).toHaveValue("Ana");
    expect(screen.getByLabelText("E-mail")).toHaveValue("ana@exemplo.com");
  });

  it("recarregar no passo 1 mostra o aviso de dados recuperados", async () => {
    const user = setup();
    const first = renderCheckout();
    await fillHolder(user);
    await act(async () => vi.advanceTimersByTimeAsync(600));
    first.unmount();
    renderCheckout();
    expect(
      await screen.findByText("Recuperamos os dados que você preencheu nesta sessão."),
    ).toBeVisible();
    expect(screen.getByLabelText("Nome")).toHaveValue("Ana");
  });

  it("recarregar mantém o cupom aplicado (revalidado) e o desconto", async () => {
    const user = setup();
    const first = renderCheckout();
    await user.click(screen.getByRole("button", { name: /Tenho um cupom/ }));
    await user.type(screen.getByLabelText("Cupom de desconto"), "BEMVINDO10");
    await user.click(screen.getByRole("button", { name: /Aplicar\s*cupom/ }));
    await act(async () => vi.advanceTimersByTimeAsync(1300));
    expect(await screen.findByText("BEMVINDO10 · 10% de desconto")).toBeVisible();
    expect(JSON.parse(sessionStorage.getItem(KEY) ?? "{}")).toMatchObject({
      coupon: "BEMVINDO10",
    });
    first.unmount();
    renderCheckout();
    await act(async () => vi.advanceTimersByTimeAsync(1300));
    expect(await screen.findByText("BEMVINDO10 · 10% de desconto")).toBeVisible();
  });

  it("recarregar com cupom que não vale mais mostra o aviso inline e não aplica desconto", async () => {
    sessionStorage.setItem(
      KEY,
      JSON.stringify({
        v: 1,
        step: "personal",
        contact: {
          firstName: "Ana",
          lastName: "Souza",
          email: "a@b.co",
          phoneCountry: "BR",
          phone: "",
        },
        companions: [],
        coupon: "VERAO2024",
      }),
    );
    renderCheckout();
    await act(async () => vi.advanceTimersByTimeAsync(1300));
    expect(
      await screen.findByText("Seu cupom VERAO2024 não vale mais para esta reserva."),
    ).toBeVisible();
    expect(screen.queryByText(/Desconto \(/)).not.toBeInTheDocument();
  });

  it("recarregar com criança: passo 1 pede a idade e o passo 2 mostra o aviso do cartão", async () => {
    await seedSelection(makeSelection({ adults: 1, children: 1 }));
    const user = setup();
    const first = renderCheckout();
    await user.type(nth(await screen.findAllByLabelText("Nome")), "Ana");
    await user.type(nth(screen.getAllByLabelText("Sobrenome")), "Souza");
    await user.type(screen.getByLabelText("E-mail"), "ana@exemplo.com");
    await user.type(screen.getByLabelText("Número de telefone"), "11987654321");
    const child = screen.getByRole("group", { name: "Hóspede 2 · criança" });
    await user.type(within(child).getByLabelText("Nome"), "Clara");
    await user.type(within(child).getByLabelText("Sobrenome"), "Souza");
    await user.selectOptions(within(child).getByLabelText("Idade no check-in"), "7");
    await clickButton(user, "Continuar para pagamento");
    await screen.findByRole("heading", { level: 2, name: "Pagamento" });
    await act(async () => vi.advanceTimersByTimeAsync(600));
    first.unmount();

    renderCheckout();
    expect(
      await screen.findByText(
        "Recuperamos os dados que você preencheu nesta sessão. Confira a idade das crianças.",
      ),
    ).toBeVisible();
    const restored = screen.getByRole("group", { name: "Hóspede 2 · criança" });
    await user.selectOptions(within(restored).getByLabelText("Idade no check-in"), "7");
    await clickButton(user, "Continuar para pagamento");
    expect(await screen.findByRole("heading", { level: 2, name: "Pagamento" })).toBeVisible();
    expect(screen.getByText(/os dados do cartão não ficam salvos/)).toBeVisible();
  });

  it("rascunho corrompido ou de versão antiga é ignorado", async () => {
    sessionStorage.setItem(KEY, "{nao-json");
    renderCheckout();
    expect(await screen.findByLabelText("Nome")).toHaveValue("");
    sessionStorage.setItem(KEY, JSON.stringify({ v: 0, step: "payment" }));
    renderCheckout();
    expect((await screen.findAllByLabelText("Nome"))[1]).toHaveValue("");
  });

  it("pagehide limpa número, validade, CVV e documento", async () => {
    const user = setup();
    renderCheckout();
    await fillHolder(user);
    await clickButton(user, "Continuar para pagamento");
    await fillCard(user);
    expect(screen.getByLabelText("Número do cartão")).toHaveValue("4111 1111 1111 1111");
    act(() => {
      window.dispatchEvent(new Event("pagehide"));
    });
    expect(screen.getByLabelText("Número do cartão")).toHaveValue("");
    expect(screen.getByLabelText("Validade")).toHaveValue("");
    expect(screen.getByLabelText("CVV")).toHaveValue("");
    expect(screen.getByRole("textbox", { name: "CPF" })).toHaveValue("");
  });
});
