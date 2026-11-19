/** `Mostrando 1–5 de 14 comentários` · `3 comentários` (uma página só) · `1 comentário`. */
export const reviewsRangeLabel = (page: number, total: number, pageSize: number): string => {
  if (total === 1) return "1 comentário";
  if (total <= pageSize) return `${total} comentários`;
  const from = (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);
  return `Mostrando ${from}–${to} de ${total} comentários`;
};

/** `42 pessoas acharam útil` · `1 pessoa achou útil` · `null` quando ninguém votou. */
export const helpfulLabel = (count: number): string | null => {
  if (count <= 0) return null;
  return count === 1
    ? "1 pessoa achou útil"
    : `${count.toLocaleString("pt-BR")} pessoas acharam útil`;
};

/** Até 2 iniciais (primeiro e último nome) para o avatar sem foto: `Maria Silva` → `MS`. */
export const initials = (name: string): string => {
  const words = name.trim().split(/\s+/).filter(Boolean);
  const first = words[0]?.[0];
  if (first === undefined) return "";
  const last = words.length > 1 ? words[words.length - 1]?.[0] : undefined;
  return `${first}${last ?? ""}`.toLocaleUpperCase("pt-BR");
};
