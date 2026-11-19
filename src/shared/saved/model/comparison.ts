import { z } from "zod";
import { COMPARE_PATH } from "./routes";

export const MAX_COMPARE = 3;

export const compareEntrySchema = z.object({
  id: z.number().int().positive(),
  name: z.string().trim().min(1).max(120),
});
export type CompareEntry = z.infer<typeof compareEntrySchema>;

export type CompareToggleResult = "added" | "removed" | "full";

/** Tolerante por item: inválido sai, dedupe por id, ordem de inclusão, corte em 3. */
export const sanitizeComparison = (raw: unknown): CompareEntry[] => {
  if (!Array.isArray(raw)) return [];
  const seen = new Set<number>();
  const valid: CompareEntry[] = [];
  for (const item of raw) {
    const parsed = compareEntrySchema.safeParse(item);
    if (!parsed.success || seen.has(parsed.data.id)) continue;
    seen.add(parsed.data.id);
    valid.push(parsed.data);
  }
  return valid.slice(0, MAX_COMPARE);
};

/** Marca/desmarca. O 4º hotel é recusado (`full`) sem substituir o mais antigo. */
export const toggleCompare = (
  list: readonly CompareEntry[],
  entry: CompareEntry,
): { list: CompareEntry[]; result: CompareToggleResult } => {
  if (list.some((item) => item.id === entry.id)) {
    return { list: list.filter((item) => item.id !== entry.id), result: "removed" };
  }
  if (list.length >= MAX_COMPARE) return { list: [...list], result: "full" };
  return { list: [...list, entry], result: "added" };
};

/** `/compare?hotel=1&hotel=4`: único lugar que monta a URL da comparação. */
export const compareHref = (ids: readonly number[]): string => {
  const params = new URLSearchParams();
  for (const id of ids) params.append("hotel", String(id));
  const query = params.toString();
  return query ? `${COMPARE_PATH}?${query}` : COMPARE_PATH;
};
