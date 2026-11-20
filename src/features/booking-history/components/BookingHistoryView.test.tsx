import { act, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { readBookingHistory } from "@/shared/lib/booking-history";
import { makeBooking } from "@/shared/testing/fixtures";
import { renderWithProviders } from "@/shared/testing/render";
import { seedHotel } from "@/shared/testing/seed";
import { Toaster } from "@/shared/ui";
import { BookingHistoryView } from "./BookingHistoryView";

const ID_A = "00000000-0000-4000-8000-00000000000a";
const ID_B = "00000000-0000-4000-8000-00000000000b";
const ID_C = "00000000-0000-4000-8000-00000000000c";
const KEY = "infotera:booking-history";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

const save = (ids: string[]) =>
  window.localStorage.setItem(
    KEY,
    JSON.stringify(
      ids.map((id, index) => ({
        id,
        savedAt: new Date(Date.UTC(2026, 10, 19, 12, 10 - index)).toISOString(),
      })),
    ),
  );

type Reply = (id: string) => Response;

const stub = (reply: Reply = (id) => json(makeBooking({ id, hotelId: 1 }))) => {
  const calls: string[] = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: RequestInfo | URL) => {
      const url = new URL(String(input));
      calls.push(`${url.pathname}${url.search}`);
      if (url.pathname.startsWith("/bookings/"))
        return reply(decodeURIComponent(url.pathname.split("/")[2] ?? ""));
      return json(url.searchParams.getAll("id").map((id) => seedHotel(Number(id))));
    }),
  );
  return calls;
};

const renderPage = () =>
  renderWithProviders(
    <>
      <BookingHistoryView />
      <Toaster />
    </>,
  );

beforeEach(() => {
  window.localStorage.clear();
  vi.useFakeTimers({ toFake: ["Date"], now: new Date("2026-11-19T15:00:00Z") });
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("BookingHistoryView", () => {
  it("lista a reserva com hotel, datas, hóspedes, total, situação e sem PII", async () => {
    save([ID_A]);
    const calls = stub();
    const { container } = renderPage();
    expect(
      await screen.findByRole("heading", { level: 2, name: seedHotel(1).name }),
    ).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 1, name: "Minhas reservas" })).toBeInTheDocument();
    expect(container).toHaveTextContent("12–15 dez · 3 noites");
    expect(container).toHaveTextContent("2 adultos, 1 criança · 1 quarto");
    expect(container).toHaveTextContent("R$ 3.726,00");
    expect(container).toHaveTextContent("Próxima estadia");
    expect(container).toHaveTextContent("Reservada em");
    expect(
      screen.getByRole("link", { name: `Ver reserva em ${seedHotel(1).name}` }),
    ).toHaveAttribute("href", `/confirmation/${ID_A}`);
    expect(container.textContent).not.toMatch(/Ana|Souza|ana\.souza|98765|00000000-0000/);
    expect(calls.filter((call) => call.startsWith("/hotels"))).toEqual(["/hotels?id=1"]);
  });

  it("3 ids: 3 requests de reserva e a ordem do storage não muda", async () => {
    save([ID_A, ID_B, ID_C]);
    const calls = stub((id) => json(makeBooking({ id, hotelId: id === ID_B ? 4 : 1 })));
    renderPage();
    await screen.findAllByRole("heading", { level: 2 });
    expect(calls.filter((call) => call.startsWith("/bookings/"))).toHaveLength(3);
    const links = screen
      .getAllByRole("link", { name: /^Ver reserva/ })
      .map((a) => a.getAttribute("href"));
    expect(links).toEqual([
      `/confirmation/${ID_A}`,
      `/confirmation/${ID_B}`,
      `/confirmation/${ID_C}`,
    ]);
  });

  it("404 sai do storage com aviso; 500 mantém o id e oferece retry e remover", async () => {
    const user = userEvent.setup();
    save([ID_A, ID_B, ID_C]);
    let failC = true;
    stub((id) => {
      if (id === ID_B) return json({}, 404);
      if (id === ID_C && failC) return json({ error: "x" }, 500);
      return json(makeBooking({ id, hotelId: 1 }));
    });
    renderPage();
    expect(
      await screen.findByText(/1 reserva não existe mais e saiu da lista/),
    ).toBeInTheDocument();
    expect(readBookingHistory().map((entry) => entry.id)).toEqual([ID_A, ID_C]);
    expect(await screen.findByText("Não foi possível carregar esta reserva.")).toBeInTheDocument();
    failC = false;
    await user.click(screen.getByRole("button", { name: "Tentar de novo" }));
    await waitFor(() =>
      expect(screen.queryByText("Não foi possível carregar esta reserva.")).not.toBeInTheDocument(),
    );
    expect(readBookingHistory()).toHaveLength(2);
  });

  it("tentar de novo mantém a linha, o foco e os nomes dos outros hotéis", async () => {
    const user = userEvent.setup();
    save([ID_A, ID_C]);
    let release: (response: Response) => void = () => undefined;
    let attempts = 0;
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) => {
        const url = new URL(String(input));
        if (url.pathname === `/bookings/${ID_C}`) {
          attempts += 1;
          if (attempts === 1) return json({ error: "x" }, 500);
          return new Promise<Response>((resolve) => {
            release = resolve;
          });
        }
        if (url.pathname.startsWith("/bookings/")) {
          return json(makeBooking({ id: ID_A, hotelId: 1 }));
        }
        return json(url.searchParams.getAll("id").map((id) => seedHotel(Number(id))));
      }),
    );
    renderPage();
    const retry = await screen.findByRole("button", { name: "Tentar de novo" });
    expect(
      await screen.findByRole("heading", { level: 2, name: seedHotel(1).name }),
    ).toBeInTheDocument();
    retry.focus();
    await user.click(retry);
    const busy = await screen.findByRole("button", { name: /Tentando/ });
    expect(busy).toHaveFocus();
    expect(screen.getByRole("heading", { level: 2, name: seedHotel(1).name })).toBeInTheDocument();
    release(json(makeBooking({ id: ID_C, hotelId: 1 })));
    await waitFor(() =>
      expect(screen.queryByText("Não foi possível carregar esta reserva.")).not.toBeInTheDocument(),
    );
  });

  it("corpo ilegível: mensagem própria sem retry", async () => {
    save([ID_A]);
    stub(() => json({ lixo: true }));
    renderPage();
    expect(await screen.findByText("Não foi possível exibir esta reserva.")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Tentar de novo" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Remover do histórico" })).toBeInTheDocument();
  });

  it("hotel que não existe: 'Hotel indisponível' e o resto da reserva", async () => {
    save([ID_A]);
    stub((id) => json(makeBooking({ id, hotelId: 999 })));
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) => {
        const url = new URL(String(input));
        return url.pathname.startsWith("/bookings/")
          ? json(makeBooking({ id: ID_A, hotelId: 999 }))
          : json([]);
      }),
    );
    const { container } = renderPage();
    expect(
      await screen.findByRole("heading", { level: 2, name: "Hotel indisponível" }),
    ).toBeInTheDocument();
    expect(container).toHaveTextContent("R$ 3.726,00");
  });

  it("remover vira fantasma (foco no Desfazer) e Desfazer reinsere na mesma posição", async () => {
    const user = userEvent.setup();
    save([ID_A, ID_B]);
    stub();
    renderPage();
    await screen.findAllByRole("heading", { level: 2 });
    const [first] = screen.getAllByRole("button", { name: /^Remover do histórico/ });
    if (!first) throw new Error("botão ausente");
    await user.click(first);
    const undo = await screen.findByRole("button", { name: /^Desfazer/ });
    await waitFor(() => expect(undo).toHaveFocus());
    expect(screen.getByText("Reserva removida do histórico.")).toBeInTheDocument();
    expect(readBookingHistory().map((entry) => entry.id)).toEqual([ID_B]);
    await user.click(undo);
    expect(readBookingHistory().map((entry) => entry.id)).toEqual([ID_A, ID_B]);
    await waitFor(() =>
      expect(screen.getAllByRole("button", { name: /^Remover do histórico/ })[0]).toHaveFocus(),
    );
  });

  it("limpar: dialog, confirmar esvazia, foco no h1 e toast com Desfazer", async () => {
    const user = userEvent.setup();
    save([ID_A]);
    stub();
    renderPage();
    await screen.findAllByRole("heading", { level: 2 });
    await user.click(screen.getByRole("button", { name: "Limpar histórico" }));
    const dialog = await screen.findByRole("dialog", { name: "Limpar o histórico?" });
    await user.click(within(dialog).getByRole("button", { name: "Limpar histórico" }));
    expect(await screen.findByText("Nenhuma reserva neste navegador")).toBeInTheDocument();
    await waitFor(() => expect(screen.getByRole("heading", { level: 1 })).toHaveFocus());
    expect(screen.getByText("Histórico apagado.")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Desfazer" }));
    expect(readBookingHistory()).toHaveLength(1);
  });

  it("cancelar o dialog não altera nada e devolve o foco ao botão", async () => {
    const user = userEvent.setup();
    save([ID_A]);
    stub();
    renderPage();
    await screen.findAllByRole("heading", { level: 2 });
    const open = screen.getByRole("button", { name: "Limpar histórico" });
    open.focus();
    await user.click(open);
    const dialog = await screen.findByRole("dialog");
    await user.click(within(dialog).getByRole("button", { name: "Cancelar" }));
    await waitFor(() => expect(open).toHaveFocus());
    expect(readBookingHistory()).toHaveLength(1);
  });

  it("vazio e storage que lança: EmptyState sem quebrar", async () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("bloqueado");
    });
    stub();
    renderPage();
    expect(await screen.findByText("Nenhuma reserva neste navegador")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Buscar hotéis" })).toHaveAttribute("href", "/");
    act(() => undefined);
  });
});
