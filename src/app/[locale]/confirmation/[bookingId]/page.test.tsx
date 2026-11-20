import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { isValidElement } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { BookingConfirmation } from "@/features/booking-confirmation";
import { BOOKING_ID, makeBooking } from "@/shared/testing/fixtures";
import ConfirmationError from "./error";
import ConfirmationNotFound from "./not-found";
import ConfirmationPage, { generateMetadata } from "./page";

vi.mock("next/navigation", async () => ({
  ...(await import("@/shared/testing/next-navigation")).navigationMock,
  notFound: () => {
    throw Object.assign(new Error("NEXT_HTTP_ERROR_FALLBACK;404"), {
      digest: "NEXT_HTTP_ERROR_FALLBACK;404",
    });
  },
}));
vi.mock("@/shared/i18n/server", () => ({ getLocale: vi.fn(async () => "pt-BR") }));
vi.mock("next/server", () => ({ connection: vi.fn(async () => undefined) }));

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

const props = (bookingId: string) => ({
  params: Promise.resolve({ locale: "pt-BR", bookingId }),
  searchParams: Promise.resolve({}),
});

const stubBookingFetch = (response: () => Response) => {
  const fetchMock = vi.fn(async (_url: string) => response());
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
};

beforeEach(() => vi.spyOn(console, "error").mockImplementation(() => undefined));
afterEach(() => vi.unstubAllGlobals());

describe("ConfirmationPage (critérios 8 e 9)", () => {
  it.each(["abc", "1", "00000000-0000-1000-8000-000000000000", "%2e%2e", "%", ""])(
    "id %j: notFound sem chamar a API",
    async (id) => {
      const fetchMock = vi.fn();
      vi.stubGlobal("fetch", fetchMock);
      await expect(ConfirmationPage(props(id))).rejects.toMatchObject({
        digest: "NEXT_HTTP_ERROR_FALLBACK;404",
      });
      expect(fetchMock).not.toHaveBeenCalled();
    },
  );

  it("UUID em maiúsculas é normalizado e compõe a feature", async () => {
    const element = await ConfirmationPage(props(BOOKING_ID.toUpperCase()));
    expect(isValidElement<{ id: string }>(element)).toBe(true);
    if (!isValidElement<{ id: string }>(element)) return;
    expect(element.type).toBe(BookingConfirmation);
    expect(element.props.id).toBe(BOOKING_ID);
  });
});

describe("generateMetadata (critérios 5 e 7)", () => {
  const robots = { index: false, follow: false };

  it("reserva encontrada: título genérico, noindex e um GET só", async () => {
    const fetchMock = stubBookingFetch(() => json(makeBooking()));
    const metadata = await generateMetadata(props(BOOKING_ID));
    expect(metadata).toEqual({ title: "Reserva confirmada | Infotera Hotéis", robots });
    expect(JSON.stringify(metadata)).not.toMatch(/Ana|exemplo\.com/);
    expect(JSON.stringify(metadata)).not.toContain(BOOKING_ID);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("404: título de não encontrada", async () => {
    stubBookingFetch(() => json({}, 404));
    expect(await generateMetadata(props(BOOKING_ID))).toEqual({
      title: "Reserva não encontrada | Infotera Hotéis",
      robots,
    });
  });

  it("id inválido: título de não encontrada, sem fetch", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    expect(await generateMetadata(props("abc"))).toEqual({
      title: "Reserva não encontrada | Infotera Hotéis",
      robots,
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("corpo fora do contrato: título de indisponível", async () => {
    stubBookingFetch(() => json({ id: BOOKING_ID }));
    expect(await generateMetadata(props(BOOKING_ID))).toEqual({
      title: "Reserva indisponível | Infotera Hotéis",
      robots,
    });
  });

  it("erro na leitura: título padrão, o metadata não derruba a página", async () => {
    stubBookingFetch(() => json({ error: "x" }, 500));
    expect(await generateMetadata(props(BOOKING_ID))).toEqual({
      title: "Reserva confirmada | Infotera Hotéis",
      robots,
    });
  });
});

describe("not-found.tsx (critério 7)", () => {
  it("h1 com foco, texto do design system e Fazer nova busca", async () => {
    render(await ConfirmationNotFound());
    expect(screen.getByRole("heading", { level: 1, name: "Reserva não encontrada" })).toHaveFocus();
    expect(
      screen.getByText(
        "Confira o número da reserva no link. Reservas de teste são apagadas quando o sistema reinicia.",
      ),
    ).toBeVisible();
    expect(screen.getByRole("link", { name: "Fazer nova busca" })).toHaveAttribute("href", "/");
  });

  it("título e robots noindex, nofollow", async () => {
    render(await ConfirmationNotFound());
    expect(document.head.querySelector("title")?.textContent).toBe(
      "Reserva não encontrada | Infotera Hotéis",
    );
    expect(document.head.querySelector('meta[name="robots"]')).toHaveAttribute(
      "content",
      "noindex, nofollow",
    );
  });
});

describe("error.tsx (critério 10)", () => {
  it("mostra o erro, chama retry e oferece Fazer nova busca", async () => {
    const retry = vi.fn();
    const user = userEvent.setup();
    render(
      <ConfirmationError error={Object.assign(new Error("x"), { digest: "d1" })} retry={retry} />,
    );
    expect(
      screen.getByRole("heading", { level: 1, name: "Não foi possível carregar sua reserva" }),
    ).toHaveFocus();
    expect(
      screen.getByText("Sua reserva não foi afetada. Verifique sua conexão e tente de novo."),
    ).toBeVisible();
    await user.click(screen.getByRole("button", { name: "Tentar de novo" }));
    expect(retry).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("link", { name: "Fazer nova busca" })).toHaveAttribute("href", "/");
  });

  it("loga só o digest (nunca a mensagem nem o id)", () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => undefined);
    render(
      <ConfirmationError
        error={Object.assign(new Error(`falhou ${BOOKING_ID}`), { digest: "d1" })}
        retry={vi.fn()}
      />,
    );
    expect(log).toHaveBeenCalledWith({ event: "confirmation:route-error", digest: "d1" });
    expect(JSON.stringify(log.mock.calls)).not.toContain(BOOKING_ID);
  });
});
