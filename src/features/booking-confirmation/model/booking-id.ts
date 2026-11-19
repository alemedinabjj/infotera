import { z } from "zod";

/** UUID v4 em minúsculas, marcado (`brand`) para só circular depois de validado. */
export const bookingIdSchema = z.uuid({ version: "v4" }).brand<"BookingId">();
export type BookingId = z.infer<typeof bookingIdSchema>;

const safeDecode = (raw: string): string | null => {
  try {
    return decodeURIComponent(raw);
  } catch {
    return null;
  }
};

/**
 * Id da rota `/confirmation/[bookingId]`: decodifica, tira espaços e normaliza para minúsculas
 * (o json-server compara o id exato). Só UUID v4 passa; qualquer outra coisa (`abc`, `1`,
 * `../hotels/1`, `%2e%2e`, v1, vazio, `%` solto) é `null`: a página responde "não encontrada"
 * sem chamar a API. Isso fecha a enumeração de reservas por id numérico.
 */
export const parseBookingId = (raw: string): BookingId | null => {
  const decoded = safeDecode(raw);
  if (decoded === null) return null;
  const parsed = bookingIdSchema.safeParse(decoded.trim().toLowerCase());
  return parsed.success ? parsed.data : null;
};
