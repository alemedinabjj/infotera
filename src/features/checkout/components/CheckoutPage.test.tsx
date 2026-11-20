import { screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useBookingDraft } from "@/shared/stores/booking-draft";
import { makeRoom } from "@/shared/testing/fixtures";
import { navigationSpies } from "@/shared/testing/next-navigation";
import { useToastStore } from "@/shared/ui/toast/toast-store";
import {
  happyApi,
  makeSelection,
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
  useToastStore.setState({ toasts: [] });
  stubLoadedDocument();
});
afterEach(() => {
  vi.unstubAllGlobals();
});

describe("gate da página", () => {
  // Primeiro teste: o store ainda não hidratou (hasHydrated é estado do singleton do módulo).
  it("antes da hidratação: skeleton com aria-busy e nada de formulário ou redirect", () => {
    happyApi();
    renderCheckout();
    expect(document.querySelector('[aria-busy="true"]')).not.toBeNull();
    expect(screen.getByText("Carregando sua reserva…")).toBeInTheDocument();
    expect(screen.queryByRole("form")).not.toBeInTheDocument();
    expect(navigationSpies.replace).not.toHaveBeenCalled();
  });

  it("sem seleção depois da hidratação: replace para a home com o aviso, formulário nunca aparece", async () => {
    happyApi();
    await seedSelection(null);
    renderCheckout();
    await waitFor(() =>
      expect(navigationSpies.replace).toHaveBeenCalledWith("/?notice=choose-room"),
    );
    expect(screen.queryByRole("heading", { name: "Dados dos hóspedes" })).not.toBeInTheDocument();
    expect(navigationSpies.replace).toHaveBeenCalledTimes(1);
  });

  it("documento carregado em outra rota recarrega uma vez e não mostra o formulário", async () => {
    stubLoadedDocument("/hotel/1");
    const reload = vi.fn();
    vi.stubGlobal("location", { ...window.location, reload });
    happyApi();
    await seedSelection(makeSelection());
    renderCheckout();
    await waitFor(() => expect(reload).toHaveBeenCalledTimes(1));
    expect(document.querySelector('[aria-busy="true"]')).not.toBeNull();
    expect(screen.queryByRole("heading", { name: "Dados dos hóspedes" })).not.toBeInTheDocument();
  });

  it("com seleção válida mostra o checkout", async () => {
    happyApi();
    await seedSelection(makeSelection());
    renderCheckout();
    expect(
      await screen.findByRole("heading", { level: 2, name: "Dados dos hóspedes" }),
    ).toBeVisible();
    expect(
      screen.getByRole("heading", { level: 1, name: "Finalizar reserva" }),
    ).toBeInTheDocument();
  });
});

describe("estados bloqueantes", () => {
  it("esgotado: h1, link 'Ver quartos' com critérios e nenhum formulário", async () => {
    happyApi({ available: 0 });
    await seedSelection(makeSelection());
    renderCheckout();
    expect(
      await screen.findByRole("heading", { level: 1, name: "Este quarto esgotou" }),
    ).toBeVisible();
    expect(screen.getByRole("link", { name: "Ver quartos" })).toHaveAttribute(
      "href",
      expect.stringMatching(/^\/hotel\/1\?destination=/),
    );
    expect(screen.getByRole("link", { name: "Fazer nova busca" })).toHaveAttribute("href", "/");
    expect(screen.queryByRole("form")).not.toBeInTheDocument();
  });

  it("menos quartos que o pedido e quarto pequeno", async () => {
    happyApi({ available: 1 });
    await seedSelection(makeSelection({ rooms: 2, adults: 2 }));
    const first = renderCheckout();
    expect(
      await screen.findByRole("heading", { level: 1, name: "Só 1 quarto disponível" }),
    ).toBeVisible();
    first.unmount();

    happyApi({ maxGuests: 1 });
    await seedSelection(makeSelection({ adults: 2 }));
    renderCheckout();
    expect(
      await screen.findByRole("heading", { level: 1, name: "Este quarto não acomoda sua busca" }),
    ).toBeVisible();
  });

  it("check-in antes de hoje: link sem critérios, sem esperar a API", async () => {
    happyApi();
    await seedSelection(makeSelection({ checkIn: "2020-01-01", checkOut: "2020-01-03" }));
    renderCheckout();
    expect(
      await screen.findByRole("heading", { level: 1, name: "As datas desta reserva já passaram" }),
    ).toBeVisible();
    expect(screen.getByRole("link", { name: "Escolher novas datas" })).toHaveAttribute(
      "href",
      "/hotel/1",
    );
  });

  it("quarto de outro hotel limpa a seleção e cai no redirect", async () => {
    happyApi({ hotelId: 2 });
    await seedSelection(makeSelection());
    renderCheckout();
    await waitFor(() => expect(useBookingDraft.getState().selection).toBeNull());
    await waitFor(() => expect(navigationSpies.replace).toHaveBeenCalledWith("/?notice=choose-room"));
  });

  it("hotel 404 limpa a seleção", async () => {
    stubApi({
      "/hotels/1": () => new Response("{}", { status: 404 }),
      "/rooms/1": makeRoom(),
    });
    await seedSelection(makeSelection());
    renderCheckout();
    await waitFor(() => expect(useBookingDraft.getState().selection).toBeNull());
  });
});
