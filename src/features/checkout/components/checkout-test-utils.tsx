import { act, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";
import type { Locale } from "@/shared/i18n/config";
import { addDays, todayISO } from "@/shared/lib/dates";
import { type RoomSelection, useBookingDraft } from "@/shared/stores/booking-draft";
import { makeHotel, makeRoom, makeSearchCriteria } from "@/shared/testing/fixtures";
import { renderWithProviders } from "@/shared/testing/render";
import { checkoutMessages } from "../i18n/messages";
import { CheckoutPage } from "./CheckoutPage";

export const API = "http://api.test";

/** Dicionário pt-BR: os testes buscam os campos pelos mesmos rótulos que a tela usa. */
export const ptT = checkoutMessages.get("pt-BR");

type Body = unknown | (() => Response | Promise<Response>);

export const jsonResponse = (body: unknown, status = 200): Response =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });

/** `fetch` por caminho (`/hotels/1`, `/rooms/1`); corpo ou função que devolve a `Response`. */
export const stubApi = (routes: Record<string, Body>) => {
  const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
    const path = String(input).replace(API, "").split("?")[0] ?? "";
    const handler = routes[path];
    if (handler === undefined) throw new Error(`unexpected route: ${path}`);
    return typeof handler === "function" ? handler() : jsonResponse(handler);
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
};

export const checkIn = addDays(todayISO(), 30);
export const checkOut = addDays(todayISO(), 33);

export const makeSelection = (
  criteria: Parameters<typeof makeSearchCriteria>[0] = {},
  ids: { hotelId?: number; roomId?: number } = {},
): RoomSelection => ({
  hotelId: ids.hotelId ?? 1,
  roomId: ids.roomId ?? 1,
  criteria: makeSearchCriteria({
    checkIn,
    checkOut,
    adults: 1,
    children: 0,
    rooms: 1,
    ...criteria,
  }),
});

/** Grava a seleção e reidrata o store (o gate só redireciona depois da hidratação). */
export const seedSelection = async (selection: RoomSelection | null): Promise<void> => {
  sessionStorage.clear();
  useBookingDraft.setState({ selection });
  await act(async () => {
    await useBookingDraft.persist.rehydrate();
  });
};

/** Simula o documento carregado em `path` (o `useStrictDocument` lê a URL de carga). */
export const stubLoadedDocument = (path = "/checkout") =>
  vi.spyOn(performance, "getEntriesByType").mockReturnValue([
    {
      name: `http://localhost${path}`,
      entryType: "navigation",
      startTime: 0,
      duration: 0,
      toJSON: () => ({}),
    },
  ]);

export const happyApi = (
  room: Parameters<typeof makeRoom>[0] = {},
  hotel: Parameters<typeof makeHotel>[0] = {},
) => stubApi({ "/hotels/1": makeHotel(hotel), "/rooms/1": makeRoom(room) });

export const renderCheckout = (locale: Locale = "pt-BR") =>
  renderWithProviders(<CheckoutPage />, { locale });

export const plain = (value: string | null): string => (value ?? "").replaceAll(" ", " ");

export const newUser = () => userEvent.setup();

/** Passo 1 (1 adulto, sem criança): titular. */
export const fillHolder = async (user: ReturnType<typeof userEvent.setup>) => {
  await user.type(await screen.findByLabelText(ptT.fields.firstName), "Ana");
  await user.type(screen.getByLabelText(ptT.fields.lastName), "Souza");
  await user.type(screen.getByLabelText("E-mail"), "ana@exemplo.com");
  await user.type(screen.getByLabelText(ptT.fields.phoneNumber), "11987654321");
};

export const fillCard = async (user: ReturnType<typeof userEvent.setup>) => {
  await user.type(await screen.findByLabelText(ptT.payment.number), "4111111111111111");
  await user.type(screen.getByLabelText(ptT.payment.name), "ANA SOUZA");
  await user.type(screen.getByLabelText(ptT.payment.expiry), "1230");
  await user.type(screen.getByLabelText("CVV"), "123");
  await user.type(screen.getByRole("textbox", { name: "CPF" }), "52998224725");
};

export const clickButton = (user: ReturnType<typeof userEvent.setup>, name: string | RegExp) =>
  user.click(screen.getByRole("button", { name }));

/** Do passo 1 até a revisão (cartão de teste). */
export const goToReview = async (user: ReturnType<typeof userEvent.setup>) => {
  await fillHolder(user);
  await clickButton(user, ptT.steps.primary.personal);
  await fillCard(user);
  await clickButton(user, ptT.steps.primary.payment);
  await screen.findByRole("heading", { level: 2, name: ptT.steps.titles.review });
};
