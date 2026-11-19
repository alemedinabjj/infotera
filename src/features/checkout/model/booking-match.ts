import type { Booking, BookingInput } from "@/shared/api/schemas";

/**
 * A reserva lida é a **deste** pedido? Compara os campos que identificam a reserva (hotel, quarto,
 * datas, total, final do cartão e e-mail do titular). Um id existente de outro pedido não vale como
 * `created`: o retry reconhece só a própria reserva.
 */
export const bookingMatchesInput = (stored: Booking, input: BookingInput): boolean =>
  stored.hotelId === input.hotelId &&
  stored.roomId === input.roomId &&
  stored.checkIn === input.checkIn &&
  stored.checkOut === input.checkOut &&
  stored.totalPrice === input.totalPrice &&
  stored.payment?.cardLast4 === input.payment?.cardLast4 &&
  stored.guests[0]?.email === input.guests[0]?.email;
