const formatter = new Intl.DateTimeFormat("pt-BR", {
  timeZone: "America/Sao_Paulo",
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

/**
 * `19/11/2026, 12:04` no horário de Brasília, qualquer que seja o fuso do processo (o RSC roda em
 * UTC na Vercel). Montado por partes para não depender do separador de data e hora do ICU.
 */
export const formatBookedAt = (iso: string): string => {
  const parts = Object.fromEntries(
    formatter.formatToParts(new Date(iso)).map((part) => [part.type, part.value]),
  );
  return `${parts.day}/${parts.month}/${parts.year}, ${parts.hour}:${parts.minute}`;
};
