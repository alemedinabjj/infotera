import { randomUUID } from "node:crypto";
import type { APIRequestContext } from "@playwright/test";
import { API_URL, CHECK_IN, CHECK_OUT } from "./hotel-search";

/** Hotel 1 (Copacabana Palace), quarto 1: R$ 1.200 por noite, 1 cama king (seed estável). */
export const ROOM_PRICE_CENTS = 120_000;

export const HOLDER = {
  firstName: "Ana",
  lastName: "Souza",
  email: "ana.souza@exemplo.com",
  phone: "(11) 98765-4321",
};

type BookingBody = Record<string, unknown>;

/** `BEMVINDO10`, R$ 1.200 × 3 noites × 1 quarto: estadia R$ 3.600 → total R$ 3.726,00. */
const f5Body = (): BookingBody => ({
  hotelId: 1,
  roomId: 1,
  checkIn: CHECK_IN,
  checkOut: CHECK_OUT,
  rooms: 1,
  adults: 2,
  children: 1,
  guests: [
    { ...HOLDER, kind: "adult" },
    { firstName: "Bruno", lastName: "Souza", kind: "adult" },
    { firstName: "Clara", lastName: "Souza", kind: "child", age: 7 },
  ],
  totalPrice: 3726,
  payment: { method: "credit_card", cardLast4: "1111" },
  priceBreakdown: {
    nightlyCents: ROOM_PRICE_CENTS,
    nights: 3,
    rooms: 1,
    subtotalCents: 360_000,
    discountCents: 36_000,
    serviceFeeCents: 32_400,
    taxCents: 16_200,
    totalCents: 372_600,
    couponCode: "BEMVINDO10",
  },
  createdAt: new Date().toISOString(),
});

/** Corpo do `curl` do README da mock-api: sem hóspedes, sem detalhamento e sem pagamento. */
export const README_FORMAT_BOOKING: BookingBody = {
  hotelId: 1,
  roomId: 1,
  checkIn: CHECK_IN,
  checkOut: CHECK_OUT,
  rooms: 1,
  adults: 2,
  children: 0,
  guests: [],
  totalPrice: 3600,
  createdAt: new Date().toISOString(),
};

export const bookingPath = (id: string): string => `/confirmation/${id}`;

/**
 * Cria a reserva direto na mock-api (o E2E da F6 não passa pelo checkout). O `id` é um UUID v4,
 * como o da F5. `overrides` troca ou acrescenta campos; um valor `undefined` remove o campo. A API
 * não valida nada, então corpos forjados (hotel inexistente, total adulterado) são reais.
 */
export const createBooking = async (
  request: APIRequestContext,
  overrides: BookingBody = {},
  base: BookingBody = f5Body(),
): Promise<string> => {
  const id = randomUUID();
  const body = Object.fromEntries(
    Object.entries({ ...base, ...overrides, id }).filter(([, value]) => value !== undefined),
  );
  const response = await request.post(`${API_URL}/bookings`, { data: body });
  if (!response.ok()) throw new Error(`POST /bookings falhou: ${response.status()}`);
  return id;
};
