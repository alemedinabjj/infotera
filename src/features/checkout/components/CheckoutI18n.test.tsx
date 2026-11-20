import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { navigationSpies } from "@/shared/testing/next-navigation";
import { useToastStore } from "@/shared/ui/toast/toast-store";
import { createBookingAction } from "../api/create-booking.action";
import { checkoutMessages } from "../i18n/messages";
import {
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

const action = vi.mocked(createBookingAction);
const en = checkoutMessages.get("en-US");
const PORTUGUESE = /[ãõçáéíóúâêô]|\b(não|você|reserva|hóspede|pagamento|cartão)\b/i;

beforeEach(async () => {
  action.mockReset();
  navigationSpies.replace.mockClear();
  useToastStore.setState({ toasts: [] });
  stubLoadedDocument("/en/checkout");
  happyApi({}, { name: "Grand Hotel", address: "1 Main St" });
  await seedSelection(makeSelection());
});
afterEach(() => {
  vi.unstubAllGlobals();
});

const openCheckout = async () => {
  const user = userEvent.setup();
  renderCheckout("en-US");
  await screen.findByRole("heading", { level: 2, name: en.steps.titles.personal });
  return user;
};

type User = ReturnType<typeof userEvent.setup>;

/** Passos 1 e 2 preenchidos em inglês; termina na revisão. */
const reachReview = async (user: User) => {
  await user.type(screen.getByLabelText(en.fields.firstName), "Ana");
  await user.type(screen.getByLabelText(en.fields.lastName), "Souza");
  await user.type(screen.getByLabelText(en.fields.email), "ana@example.com");
  await user.type(screen.getByLabelText(en.fields.phoneNumber), "11987654321");
  await user.click(screen.getByRole("button", { name: en.steps.primary.personal }));
  await user.type(await screen.findByLabelText(en.payment.number), "4111111111111111");
  await user.type(screen.getByLabelText(en.payment.name), "ANA SOUZA");
  await user.type(screen.getByLabelText(en.payment.expiry), "1230");
  await user.type(screen.getByLabelText(en.payment.cvv), "123");
  await user.type(screen.getByRole("textbox", { name: en.payment.cpf }), "52998224725");
  expect(screen.getByText(en.payment.brand("Visa"))).toBeInTheDocument();
  await user.click(screen.getByRole("button", { name: en.steps.primary.payment }));
  await screen.findByRole("heading", { level: 2, name: en.steps.titles.review });
};

describe("checkout em en-US", () => {
  it("passo 1: títulos, rótulos e aviso de demonstração em inglês", async () => {
    await openCheckout();
    expect(screen.getByRole("heading", { level: 1, name: en.layout.heading })).toBeVisible();
    expect(screen.getByText(en.steps.counter(1, 3))).toBeVisible();
    expect(screen.getByText(en.demoNotice)).toBeVisible();
    expect(screen.getByLabelText(en.fields.firstName)).toBeVisible();
    expect(screen.getByLabelText(en.fields.phoneNumber)).toBeVisible();
    expect(screen.getByRole("option", { name: en.phone.countries.BR.label })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: en.layout.backToHotel })).toHaveAttribute(
      "href",
      expect.stringMatching(/^\/en\/hotel\/1\?/),
    );
  });

  it("erros de validação vêm em inglês (campo e resumo) e nada em português", async () => {
    const user = await openCheckout();
    await user.click(screen.getByRole("button", { name: en.steps.primary.personal }));
    expect(await screen.findByText(en.validation.firstNameRequired)).toBeVisible();
    expect(screen.getByText(en.validation.emailRequired)).toBeVisible();
    expect(screen.getByText(en.validation.phoneRequired)).toBeVisible();
    expect(screen.getByRole("form").textContent).not.toMatch(PORTUGUESE);
  });

  it("sem seleção: o redirect para a home respeita o prefixo /en", async () => {
    await seedSelection(null);
    renderCheckout("en-US");
    await waitFor(() =>
      expect(navigationSpies.replace).toHaveBeenCalledWith("/en?notice=choose-room"),
    );
  });

  it("do passo 1 à confirmação: textos em inglês e replace para /en/confirmation/:id", async () => {
    action.mockResolvedValue({ status: "created", bookingId: "b-1" });
    const user = await openCheckout();
    await reachReview(user);
    expect(screen.getByText(en.review.card("Visa", "1111", "12/30"))).toBeVisible();
    await user.click(screen.getByRole("checkbox", { name: en.terms.checkbox }));
    await user.click(screen.getByRole("button", { name: en.steps.primary.review }));
    await waitFor(() =>
      expect(navigationSpies.replace).toHaveBeenCalledWith("/en/confirmation/b-1"),
    );
  });

  it("falha do envio: alerta em inglês com a ação de tentar de novo", async () => {
    action.mockResolvedValue({ status: "failed", kind: "http" });
    const user = await openCheckout();
    await reachReview(user);
    await user.click(screen.getByRole("checkbox", { name: en.terms.checkbox }));
    await user.click(screen.getByRole("button", { name: en.steps.primary.review }));
    expect(await screen.findByText(en.submit.failedTitle)).toBeVisible();
    expect(screen.getByRole("button", { name: en.retry })).toBeVisible();
  });
});
