import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { readBookingHistory } from "@/shared/lib/booking-history";
import { useBookingDraft } from "@/shared/stores/booking-draft";
import { BOOKING_ID, makeSearchCriteria } from "@/shared/testing/fixtures";
import { BookingNumber } from "./BookingNumber";
import { NewSearchLink } from "./NewSearchLink";
import { RememberBooking } from "./RememberBooking";

const stubClipboard = (writeText: () => Promise<void>) => {
  vi.stubGlobal("navigator", { clipboard: { writeText: vi.fn(writeText) } });
  return vi.mocked(navigator.clipboard.writeText);
};

const renderNumber = () =>
  render(
    <BookingNumber number={BOOKING_ID} stayLabel="12–15 dez · 3 noites" totalCents={372600} />,
  );

beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
});
afterEach(() => vi.unstubAllGlobals());

describe("BookingNumber e copiar (critério 16)", () => {
  it("mostra o UUID completo e a linha Estadia · Total", () => {
    renderNumber();
    expect(screen.getByText("Número da reserva")).toBeVisible();
    expect(screen.getByText(BOOKING_ID, { normalizer: (text) => text })).toBeInTheDocument();
    expect(screen.getByText("12–15 dez · 3 noites")).toBeVisible();
    expect(screen.getByText(/R\$\s3\.726,00/)).toBeVisible();
  });

  it("mostra o código curto (8 primeiros em maiúsculas) acima do número completo", () => {
    renderNumber();
    expect(screen.getByText("Código")).toBeVisible();
    const code = screen.getByText(BOOKING_ID.slice(0, 8).toUpperCase());
    expect(code).toHaveClass("select-all");
  });

  it("o número não tem aria-label e é select-all, sem tradução", () => {
    renderNumber();
    const number = screen.getByText(BOOKING_ID);
    expect(number).not.toHaveAttribute("aria-label");
    expect(number).toHaveAttribute("translate", "no");
    expect(number).toHaveClass("select-all");
    expect(number.querySelectorAll("wbr")).toHaveLength(4);
  });

  it("copia exatamente o UUID, troca o rótulo por 2 s e anuncia na linha viva", async () => {
    const user = userEvent.setup();
    const writeText = stubClipboard(async () => undefined);
    renderNumber();
    const button = await screen.findByRole("button", { name: "Copiar número da reserva" });
    vi.useFakeTimers({ shouldAdvanceTime: true });
    await user.click(button);
    expect(writeText).toHaveBeenCalledWith(BOOKING_ID);
    expect(await screen.findByRole("button", { name: "Copiado" })).toHaveFocus();
    expect(screen.getByText("Número da reserva copiado.")).toBeInTheDocument();
    expect(screen.getByText("Número da reserva copiado.").closest("[aria-live]")).toHaveAttribute(
      "aria-live",
      "polite",
    );
    await act(async () => {
      await vi.advanceTimersByTimeAsync(2100);
    });
    expect(screen.getByRole("button", { name: "Copiar número da reserva" })).toBeVisible();
    expect(screen.queryByText("Número da reserva copiado.")).not.toBeInTheDocument();
    vi.useRealTimers();
  });

  it("desmontar durante o 'Copiado' cancela o timeout", async () => {
    const user = userEvent.setup();
    stubClipboard(async () => undefined);
    const { unmount } = renderNumber();
    const button = await screen.findByRole("button", { name: "Copiar número da reserva" });
    vi.useFakeTimers({ shouldAdvanceTime: true });
    await user.click(button);
    await screen.findByRole("button", { name: "Copiado" });
    expect(vi.getTimerCount()).toBeGreaterThan(0);
    unmount();
    expect(vi.getTimerCount()).toBe(0);
    vi.useRealTimers();
  });

  it("por teclado (Enter) também copia", async () => {
    const user = userEvent.setup();
    const writeText = stubClipboard(async () => undefined);
    renderNumber();
    await screen.findByRole("button", { name: "Copiar número da reserva" });
    await user.tab();
    expect(screen.getByRole("button", { name: "Copiar número da reserva" })).toHaveFocus();
    await user.keyboard("{Enter}");
    expect(writeText).toHaveBeenCalledTimes(1);
  });

  it("sem Clipboard API: mostra a saída manual, seleciona o número e mantém o foco", async () => {
    const user = userEvent.setup();
    vi.stubGlobal("navigator", {});
    renderNumber();
    const button = await screen.findByRole("button", { name: "Copiar número da reserva" });
    await user.click(button);
    expect(screen.getByText("Não foi possível copiar. Selecione o número e copie.")).toBeVisible();
    expect(button).toHaveFocus();
    expect(window.getSelection()?.toString()).toBe(BOOKING_ID);
    expect(screen.queryByRole("button", { name: "Copiado" })).not.toBeInTheDocument();
  });

  it("writeText recusado também cai na saída manual", async () => {
    const user = userEvent.setup();
    stubClipboard(async () => {
      throw new DOMException("negado", "NotAllowedError");
    });
    renderNumber();
    await user.click(await screen.findByRole("button", { name: "Copiar número da reserva" }));
    expect(
      await screen.findByText("Não foi possível copiar. Selecione o número e copie."),
    ).toBeVisible();
  });

  it("a linha viva fica sempre montada, abaixo do botão", async () => {
    renderNumber();
    const button = await screen.findByRole("button", { name: "Copiar número da reserva" });
    const live = document.querySelector("[aria-live='polite']");
    expect(live).toBeInTheDocument();
    expect(
      button.compareDocumentPosition(live as Node) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });
});

describe("NewSearchLink (critério 17)", () => {
  it("é um link para / com o texto do design system", () => {
    render(<NewSearchLink />);
    expect(screen.getByRole("link", { name: "Fazer nova busca" })).toHaveAttribute("href", "/");
  });

  it("limpa a seleção do booking-draft, inclusive a chave persistida", async () => {
    useBookingDraft.setState({
      selection: { hotelId: 1, roomId: 1, criteria: makeSearchCriteria() },
    });
    sessionStorage.setItem("infotera:booking-draft", '{"state":{"selection":{}},"version":1}');
    const user = userEvent.setup();
    render(<NewSearchLink />);
    await user.click(screen.getByRole("link", { name: "Fazer nova busca" }));
    expect(useBookingDraft.getState().selection).toBeNull();
    expect(sessionStorage.getItem("infotera:booking-draft")).toBeNull();
  });
});

describe("RememberBooking (critério 18)", () => {
  it("grava { id, savedAt } e não duplica no remount", async () => {
    const { unmount } = render(<RememberBooking id={BOOKING_ID} />);
    await waitFor(() => expect(readBookingHistory()).toHaveLength(1));
    unmount();
    render(<RememberBooking id={BOOKING_ID} />);
    expect(readBookingHistory()).toHaveLength(1);
    const raw = localStorage.getItem("infotera:booking-history") ?? "";
    expect(Object.keys(JSON.parse(raw)[0]).sort()).toEqual(["id", "savedAt"]);
  });

  it("não grava o que não é um id de reserva", () => {
    render(<RememberBooking id="1" />);
    expect(localStorage.getItem("infotera:booking-history")).toBeNull();
  });
});
