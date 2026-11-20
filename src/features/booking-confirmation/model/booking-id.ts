import { z } from "zod";

/**
 * Id aceito na rota, marcado (`brand`) para só circular depois de validado: UUID v4 (formato da F5)
 * ou o id curto que o json-server gera para reservas criadas por `POST` direto (ex.: `L-nHVI_`).
 */
export const bookingIdSchema = z.string().brand<"BookingId">();
export type BookingId = z.infer<typeof bookingIdSchema>;

const UUID_V4 = z.uuid({ version: "v4" });
/** UUID de qualquer versão, com ou sem hífens: fora do v4, não é id nosso nem do json-server. */
const UUID_SHAPE = /^[0-9a-f]{8}-?[0-9a-f]{4}-?[0-9a-f]{4}-?[0-9a-f]{4}-?[0-9a-f]{12}$/i;
const SHORT_ID = /^[A-Za-z0-9_-]{6,36}$/;
const ONLY_DIGITS = /^\d+$/;

const safeDecode = (raw: string): string | null => {
  try {
    return decodeURIComponent(raw);
  } catch {
    return null;
  }
};

/** Id curto do json-server: caixa preservada (o servidor compara o id exato), nunca só dígitos. */
const isShortId = (value: string): boolean =>
  SHORT_ID.test(value) && !ONLY_DIGITS.test(value) && !UUID_SHAPE.test(value);

/**
 * Id da rota `/confirmation/[bookingId]`: decodifica e tira espaços. UUID v4 é normalizado para
 * minúsculas; o id curto do json-server (`^[A-Za-z0-9_-]{6,36}$`, não só dígitos) segue como veio.
 * Qualquer outra coisa (`abc`, `1`, `123456`, `../hotels/1`, `%2e%2e`, v1, vazio, `%` solto) é
 * `null`: a página responde "não encontrada" sem chamar a API. Ids puramente numéricos continuam
 * rejeitados, o que fecha a enumeração de reservas.
 */
export const parseBookingId = (raw: string): BookingId | null => {
  const decoded = safeDecode(raw);
  if (decoded === null) return null;
  const trimmed = decoded.trim();
  const uuid = UUID_V4.safeParse(trimmed.toLowerCase());
  if (uuid.success) return bookingIdSchema.parse(uuid.data);
  return isShortId(trimmed) ? bookingIdSchema.parse(trimmed) : null;
};
