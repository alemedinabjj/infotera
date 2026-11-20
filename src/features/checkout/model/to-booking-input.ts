import type { BookingInput } from "@/shared/api/schemas";
import { centsToReais } from "@/shared/lib/currency";
import type { BookingRequest } from "./booking-request";
import type { PriceQuote } from "./price";

type BookingGuestInput = BookingInput["guests"][number];

/**
 * Corpo do `POST /bookings` (com `id` = `attemptId`). `totalPrice` vem do `quote` recalculado no
 * servidor. Contato só no titular; nada de cartão (só `cardLast4`) nem documento.
 */
export const toBookingInput = (
  request: BookingRequest,
  quote: PriceQuote,
  now: Date,
): BookingInput & { id: string } => {
  const holder: BookingGuestInput = {
    firstName: request.contact.firstName,
    lastName: request.contact.lastName,
    email: request.contact.email,
    phone: request.contact.phone,
    kind: "adult",
  };
  const others = request.companions.map(
    (companion): BookingGuestInput => ({
      firstName: companion.firstName,
      lastName: companion.lastName,
      kind: companion.kind,
      ...(companion.age === null ? {} : { age: companion.age }),
    }),
  );
  const { criteria } = request;
  return {
    id: request.attemptId,
    hotelId: request.hotelId,
    roomId: request.roomId,
    checkIn: criteria.checkIn,
    checkOut: criteria.checkOut,
    rooms: criteria.rooms,
    adults: criteria.adults,
    children: criteria.children,
    guests: [holder, ...others],
    totalPrice: centsToReais(quote.totalCents),
    payment: { method: "credit_card", cardLast4: request.cardLast4 },
    priceBreakdown: {
      nightlyCents: quote.nightlyCents,
      nights: quote.nights,
      rooms: quote.rooms,
      subtotalCents: quote.subtotalCents,
      discountCents: quote.discountCents,
      serviceFeeCents: quote.serviceFeeCents,
      taxCents: quote.taxCents,
      totalCents: quote.totalCents,
      ...(quote.couponCode === null ? {} : { couponCode: quote.couponCode }),
    },
    createdAt: now.toISOString(),
  };
};
