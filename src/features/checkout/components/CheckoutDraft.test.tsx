import { act, screen } from "@testing-library/react";
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
