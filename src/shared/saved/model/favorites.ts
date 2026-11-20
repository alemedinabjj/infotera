import { z } from "@/shared/lib/zod";

/** Teto técnico (storage). Com 60 hotéis no seed nunca aparece no uso normal. */
export const FAVORITES_LIMIT = 100;

export const favoriteEntrySchema = z.object({
  id: z.number().int().positive(),
  addedAt: z.iso.datetime({ offset: true }),
});
export type FavoriteEntry = z.infer<typeof favoriteEntrySchema>;

export type ToggleResult = "added" | "removed" | "limit";

const byNewest = (a: FavoriteEntry, b: FavoriteEntry): number =>
  Date.parse(b.addedAt) - Date.parse(a.addedAt);

/**
 * Lê o valor persistido de forma tolerante **por item**: item inválido sai, os válidos ficam,
 * há dedupe por id (vale o primeiro), ordem do mais recente para o mais antigo e corte no teto.
 */
export const sanitizeFavorites = (raw: unknown): FavoriteEntry[] => {
  if (!Array.isArray(raw)) return [];
  const seen = new Set<number>();
  const valid: FavoriteEntry[] = [];
  for (const item of raw) {
    const parsed = favoriteEntrySchema.safeParse(item);
    if (!parsed.success || seen.has(parsed.data.id)) continue;
    seen.add(parsed.data.id);
    valid.push(parsed.data);
  }
  return valid.sort(byNewest).slice(0, FAVORITES_LIMIT);
};

/** Favorita ou desfavorita. No teto, uma nova inclusão é recusada (`limit`) sem mudar a lista. */
export const toggleFavorite = (
  list: readonly FavoriteEntry[],
  id: number,
  now: Date,
): { list: FavoriteEntry[]; result: ToggleResult } => {
  if (list.some((entry) => entry.id === id)) {
    return { list: list.filter((entry) => entry.id !== id), result: "removed" };
  }
  if (list.length >= FAVORITES_LIMIT) return { list: [...list], result: "limit" };
  return { list: [{ id, addedAt: now.toISOString() }, ...list], result: "added" };
};

/** Desfazer: volta com o `addedAt` original, na posição certa da ordem por data. */
export const restoreFavorite = (
  list: readonly FavoriteEntry[],
  entry: FavoriteEntry,
): FavoriteEntry[] => {
  if (list.some((item) => item.id === entry.id)) return [...list];
  return [...list, entry].sort(byNewest).slice(0, FAVORITES_LIMIT);
};
