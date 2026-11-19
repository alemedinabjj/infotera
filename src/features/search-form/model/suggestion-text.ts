/** `offset` = posição (em caracteres) onde o trecho começa em `name`: chave estável e única. */
export type HighlightSegment = { text: string; match: boolean; offset: number };

const DIACRITICS = /\p{M}/gu;

/** Trim + minúsculas + sem acento, igual ao `searchName` do servidor ("São" e "sao" são a mesma chave). */
export const normalizeQuery = (value: string): string =>
  value.normalize("NFD").replace(DIACRITICS, "").toLowerCase().trim();

const foldChar = (char: string): string => {
  const folded = char.normalize("NFD").replace(DIACRITICS, "").toLowerCase();
  return folded.length === 1 ? folded : char.toLowerCase();
};

/**
 * Divide `name` em trechos, marcando o que casa com `query` ignorando acento e caixa. Sem match
 * (o `q` do servidor também casa em `country`/`type`) devolve o nome inteiro sem destaque.
 */
export const highlightMatch = (name: string, query: string): HighlightSegment[] => {
  const needle = normalizeQuery(query);
  const chars = Array.from(name);
  const start = needle ? chars.map(foldChar).join("").indexOf(needle) : -1;
  if (start < 0) return [{ text: name, match: false, offset: 0 }];
  const end = start + needle.length;
  return [
    { text: chars.slice(0, start).join(""), match: false, offset: 0 },
    { text: chars.slice(start, end).join(""), match: true, offset: start },
    { text: chars.slice(end).join(""), match: false, offset: end },
  ].filter((segment) => segment.text !== "");
};

/** Anúncio do resultado da busca: "1 destino encontrado", "5 destinos encontrados" ou o vazio. */
export const describeResultCount = (count: number, query: string): string => {
  if (count === 0) return `Nenhum destino encontrado para "${query.trim()}"`;
  return count === 1 ? "1 destino encontrado" : `${count} destinos encontrados`;
};
