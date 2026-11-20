"use client";

import { useCommonMessages } from "../../i18n/common/useCommonMessages";
import { cn } from "../../lib/cn";
import { type ComparisonRow, YES } from "../../lib/comparison";
import { Badge } from "../atoms/Badge";
import { CheckIcon, MinusIcon } from "../icons";

type ComparisonTableRowProps = {
  row: ComparisonRow;
  /** `id` de cada coluna, na ordem das células (chaves estáveis). */
  columnIds: readonly number[];
  /** Todas as linhas diferem: sem faixa colorida, só o marcador e o texto para leitor de tela. */
  markerOnly?: boolean;
  /** Texto sr-only da linha que difere (ex.: `, diferente entre os quartos`). */
  differsLabel: string;
};

/** Hífen sem quebra: "Ar-condicionado" não vira "Ar-" / "condicionado" na coluna estreita. */
const NON_BREAKING_HYPHEN = "‑";

const Cell = ({ row, value }: { row: ComparisonRow; value: string }) => {
  const t = useCommonMessages();
  if (row.kind === "text") return <>{value}</>;
  const yes = value === YES;
  return (
    <span className="inline-flex items-center gap-1">
      {yes ? (
        <CheckIcon aria-hidden="true" className="size-4 text-success" />
      ) : (
        <MinusIcon aria-hidden="true" className="size-4 text-fg-subtle" />
      )}
      {yes ? t.yes : t.no}
    </span>
  );
};

/**
 * Linha da tabela. Quando difere: barra à esquerda e texto para leitor de tela (a diferença nunca
 * é só cor) e, salvo `markerOnly`, faixa `primary-soft` na linha inteira (inclusive o `th` fixo).
 * Colunas em `row.best` ganham o selo de texto `row.bestLabel`.
 */
export const ComparisonTableRow = ({
  row,
  columnIds,
  markerOnly = false,
  differsLabel,
}: ComparisonTableRowProps) => {
  const band = row.differs && !markerOnly;
  const best = new Set(row.best);
  return (
    <tr className={band ? "bg-primary-soft" : undefined}>
      <th
        scope="row"
        className={cn(
          "sticky left-0 z-0 w-24 px-3 py-3 text-left font-medium break-words hyphens-none text-fg sm:w-44",
          row.differs ? "border-l-4 border-primary" : null,
          band ? "bg-primary-soft" : "bg-surface",
        )}
      >
        {row.label.replaceAll("-", NON_BREAKING_HYPHEN)}
        {row.differs ? <span className="sr-only">{differsLabel}</span> : null}
      </th>
      {row.cells.map((value, index) => (
        <td key={columnIds[index]} className="px-3 py-3 align-top text-fg">
          <Cell row={row} value={value} />
          {best.has(index) && row.bestLabel ? (
            <Badge tone="success" className="mt-1 flex w-fit">
              {row.bestLabel}
            </Badge>
          ) : null}
        </td>
      ))}
    </tr>
  );
};
