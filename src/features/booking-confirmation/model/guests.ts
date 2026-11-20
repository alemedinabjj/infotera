import type { Booking } from "@/shared/api/schemas";

export type GuestRole = "holder" | "adult" | "child";

/** Hóspede como aparece na tela: só nome e papel. Nunca idade, telefone nem documento. */
export type GuestLine = { key: string; name: string; role: GuestRole; roleLabel: string };

export type GuestsView = {
  /** E-mail do titular (a frase "Enviamos os detalhes para…"); `null` sem titular. */
  holderEmail: string | null;
  lines: GuestLine[];
};

const ROLE_LABELS: Record<GuestRole, string> = {
  holder: "titular",
  adult: "adulto",
  child: "criança",
};

const fullName = (guest: { firstName: string; lastName: string }): string =>
  `${guest.firstName} ${guest.lastName}`.trim();

/**
 * `j***@dominio.com`: a confirmação é um link aberto por UUID (pode ser compartilhado ou ficar numa
 * tela alheia), então o e-mail do titular nunca aparece inteiro. Sem `@` ou sem usuário vira `null`.
 */
export const maskEmail = (email: string | undefined): string | null => {
  if (!email) return null;
  const at = email.lastIndexOf("@");
  if (at < 1 || at === email.length - 1) return null;
  const [first = ""] = email;
  return `${first}***${email.slice(at)}`;
};

/**
 * Titular (primeiro hóspede, o único com contato) e acompanhantes com o tipo. Reserva no formato
 * do README (`guests: []`) devolve `lines` vazio. A `key` é estável: papel + nome + ocorrência.
 */
export const describeGuests = (booking: Pick<Booking, "guests">): GuestsView => {
  const seen = new Map<string, number>();
  const lines = booking.guests.map((guest, index): GuestLine => {
    const role: GuestRole = index === 0 ? "holder" : guest.kind === "child" ? "child" : "adult";
    const name = fullName(guest);
    const base = `${role}:${name}`;
    const occurrence = (seen.get(base) ?? 0) + 1;
    seen.set(base, occurrence);
    return { key: `${base}:${occurrence}`, name, role, roleLabel: ROLE_LABELS[role] };
  });
  return { holderEmail: maskEmail(booking.guests[0]?.email), lines };
};
