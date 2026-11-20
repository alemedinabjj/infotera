import { act, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { assignLocation } from "@/shared/lib/navigation";
import { useToastStore } from "@/shared/ui/toast/toast-store";
import { createBookingAction } from "../api/create-booking.action";
import { calculatePrice } from "../model/price";
import {
  clickButton,
  goToReview,
  happyApi,
  makeSelection,
  plain,
  renderCheckout,
  seedSelection,
  stubLoadedDocument,
} from "./checkout-test-utils";

vi.mock(
  "next/navigation",
  async () => (await import("@/shared/testing/next-navigation")).navigationMock,
);
vi.mock("@/shared/lib/navigation", () => ({ assignLocation: vi.fn(), reloadPage: vi.fn() }));
vi.mock("../api/create-booking.action", () => ({ createBookingAction: vi.fn() }));

const action = vi.mocked(createBookingAction);
const ID = "8b0e4d2a-6f3c-4a1b-9c7d-2e5f8a1b3c4d";

const consoleSpies = ["log", "info", "warn", "error", "debug"].map((method) =>
  vi.spyOn(console, method as "log"),
);

beforeEach(async () => {
  for (const spy of consoleSpies) spy.mockImplementation(() => undefined);
  action.mockReset();
  vi.mocked(assignLocation).mockClear();
  useToastStore.setState({ toasts: [] });
  stubLoadedDocument();
  happyApi();
  await seedSelection(makeSelection());
});
afterEach(() => {
  for (const spy of consoleSpies) expect(spy).not.toHaveBeenCalled();
  vi.unstubAllGlobals();
});

const toConfirm = async () => {
  const user = userEvent.setup();
  renderCheckout();
  await goToReview(user);
  await user.click(screen.getByRole("checkbox", { name: /Li e aceito os termos/ }));
  return user;
};

describe("envio (critério 28)", () => {
  it("duplo envio: 3 cliques e Enter geram uma só chamada; botão em loading mantém o foco", async () => {
    const user = await toConfirm();
    let resolve: (value: Awaited<ReturnType<typeof createBookingAction>>) => void = () => undefined;
    action.mockReturnValue(new Promise((r) => (resolve = r)));
    const button = screen.getByRole("button", { name: "Confirmar reserva" });
    await user.click(button);
    const busy = await screen.findByRole("button", { name: "Confirmando reserva…" });
    expect(busy).toHaveAttribute("aria-busy", "true");
    expect(busy).toHaveAttribute("aria-disabled", "true");
    expect(busy).not.toBeDisabled();
    await user.click(busy);
    await user.click(busy);
    busy.focus();
    await user.keyboard("{Enter}");
    expect(action).toHaveBeenCalledTimes(1);
    await act(async () => resolve({ status: "created", bookingId: ID }));
  });

  it("o corpo enviado não tem cartão, CVV, validade nem documento", async () => {
    const user = await toConfirm();
    action.mockResolvedValue({ status: "created", bookingId: ID });
    await clickButton(user, "Confirmar reserva");
    await waitFor(() => expect(action).toHaveBeenCalledTimes(1));
    const request = action.mock.calls[0]?.[0];
    const serialized = JSON.stringify(request);
    for (const secret of ["4111", "52998224725", "529.982", "12/30", "ANA SOUZA"]) {
      expect(serialized).not.toContain(secret);
    }
    expect(request).toMatchObject({
      cardLast4: "1111",
      expectedTotalCents: 414000,
      hotelId: 1,
      roomId: 1,
      contact: { phone: "+5511987654321" },
    });
  });

  it("sucesso: carga de documento para a confirmação, storage limpo e nenhum redirect para `/`", async () => {
    const user = await toConfirm();
    action.mockResolvedValue({ status: "created", bookingId: ID });
    await clickButton(user, "Confirmar reserva");
    await waitFor(() => expect(assignLocation).toHaveBeenCalledWith(`/confirmation/${ID}`));
    expect(assignLocation).not.toHaveBeenCalledWith("/");
    expect(sessionStorage.getItem("infotera:checkout-draft")).toBeNull();
    expect(sessionStorage.getItem("infotera:booking-draft")).toBeNull();
    // O formulário continua na tela (estado `leaving`), ainda em "Confirmando reserva…".
    expect(screen.getByRole("heading", { level: 2, name: "Revise e confirme" })).toBeVisible();
  });
});

describe("falhas e retry (critério 30)", () => {
  it("falha da action: alerta com foco + toast; 'Tentar de novo' reenvia com o mesmo attemptId", async () => {
    const user = await toConfirm();
    action.mockRejectedValueOnce(new Error("rede"));
    await clickButton(user, "Confirmar reserva");
    const alert = await screen.findByRole("alert", { name: "" });
    expect(alert).toHaveTextContent("Não foi possível confirmar sua reserva");
    expect(alert).toHaveTextContent("Nenhuma cobrança foi feita.");
    await waitFor(() => expect(alert.parentElement).toHaveFocus());
    expect(useToastStore.getState().toasts.map((t) => t.message)).toContain(
      "Não foi possível confirmar a reserva.",
    );
    expect(screen.getByText(/ana@exemplo\.com/)).toBeVisible();

    action.mockResolvedValueOnce({ status: "created", bookingId: ID });
    await user.click(screen.getByRole("button", { name: "Tentar de novo" }));
    await waitFor(() => expect(assignLocation).toHaveBeenCalled());
    const [first, second] = action.mock.calls.map((call) => call[0]);
    expect(first).toMatchObject({ attemptId: expect.stringMatching(/^[0-9a-f-]{36}$/) });
    expect(JSON.stringify(first)).toBe(JSON.stringify(second));
  });

  it("sem conexão: nem chama a action e mostra o alerta com 'Tentar de novo'", async () => {
    const user = await toConfirm();
    const online = vi.spyOn(window.navigator, "onLine", "get").mockReturnValue(false);
    await clickButton(user, "Confirmar reserva");
    expect(await screen.findByText("Você está sem conexão.")).toBeVisible();
    expect(
      screen.getByText("Nada foi cobrado. Tente de novo quando a conexão voltar."),
    ).toBeVisible();
    expect(action).not.toHaveBeenCalled();
    action.mockResolvedValueOnce({ status: "created", bookingId: ID });
    online.mockReturnValue(true);
    await user.click(screen.getByRole("button", { name: "Tentar de novo" }));
    await waitFor(() => expect(assignLocation).toHaveBeenCalled());
    online.mockRestore();
  });

  it("price-changed: alerta com o total antigo e o novo e o breakdown atualizado", async () => {
    const user = await toConfirm();
    const quote = calculatePrice({ pricePerNight: 1300, nights: 3, rooms: 1 });
    action.mockResolvedValueOnce({ status: "price-changed", quote });
    happyApi({ pricePerNight: 1300 });
    await clickButton(user, "Confirmar reserva");
    const title = await screen.findByText("O total da reserva mudou");
    expect(plain(title.parentElement?.textContent ?? "")).toContain(
      "Passou de R$ 4.140,00 para R$ 4.485,00. Confira o novo valor e confirme de novo.",
    );
    await waitFor(() =>
      expect(plain(screen.getByRole("region", { name: "Sua reserva" }).textContent)).toContain(
        "TotalR$ 4.485,00",
      ),
    );
  });

  it("unavailable: mensagem de esgotado e link 'Ver quartos'", async () => {
    const user = await toConfirm();
    action.mockResolvedValueOnce({ status: "unavailable", available: 0 });
    await clickButton(user, "Confirmar reserva");
    expect(await screen.findByText("Este quarto esgotou enquanto você reservava")).toBeVisible();
    expect(screen.getByRole("link", { name: "Ver quartos" })).toHaveAttribute(
      "href",
      expect.stringMatching(/^\/hotel\/1\?/),
    );
  });

  it("invalid: volta ao passo do campo citado com o erro no campo", async () => {
    const user = await toConfirm();
    action.mockResolvedValueOnce({ status: "invalid", fields: ["contact.email"] });
    await clickButton(user, "Confirmar reserva");
    expect(
      await screen.findByRole("heading", { level: 2, name: "Dados dos hóspedes" }),
    ).toBeVisible();
    await waitFor(() => expect(screen.getByLabelText("E-mail")).toHaveFocus());
    expect(screen.getAllByText("Confira este dado e tente de novo.").length).toBeGreaterThan(0);
  });

  it("coupon-invalid: alerta que cita o cupom e o novo total", async () => {
    const user = await toConfirm();
    action.mockResolvedValueOnce({ status: "coupon-invalid", reason: { kind: "expired" } });
    await clickButton(user, "Confirmar reserva");
    expect(await screen.findByText(/não vale mais/)).toBeVisible();
    expect(plain(document.body.textContent)).toContain("o total agora é R$ 4.140,00");
  });
});
