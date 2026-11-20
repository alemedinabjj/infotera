/** Células booleanas são valores semânticos; o texto ("Sim"/"Yes") vem do dicionário na renderização. */
export const YES = "yes";
export const NO = "no";

export type ComparisonRow = {
  key: string;
  label: string;
  /** `boolean`: células `Sim`/`Não` (ícone + texto); `text`: texto puro. */
  kind: "text" | "boolean";
  /** Uma célula por coluna, na ordem das colunas. */
  cells: string[];
  /** Nem todas as células são iguais. */
  differs: boolean;
  /** Índices das colunas com o melhor valor (menor preço, maior nota). Vazio quando empatam. */
  best?: readonly number[];
  /** Texto do selo das colunas em `best` ("Menor preço", "Melhor nota"). */
  bestLabel?: string;
};

/** Monta uma linha; `differs` é derivado das células. */
export const makeRow = (
  key: string,
  label: string,
  kind: ComparisonRow["kind"],
  cells: string[],
): ComparisonRow => ({ key, label, kind, cells, differs: new Set(cells).size > 1 });

/** Só as linhas em que as colunas diferem. */
export const onlyDifferences = (rows: readonly ComparisonRow[]): ComparisonRow[] =>
  rows.filter((row) => row.differs);
