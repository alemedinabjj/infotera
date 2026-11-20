import { cn } from "@/shared/lib/cn";
import { CheckIcon, MinusIcon } from "@/shared/ui";
import { type ComparisonRow as Row, YES } from "../model/room-comparison";

type ComparisonRowProps = {
  row: Row;
  /** `id` de cada quarto, na ordem das células (chaves estáveis). */
  roomIds: readonly number[];
  /** Todas as linhas diferem: sem faixa colorida, só o marcador e o texto para leitor de tela. */
  markerOnly?: boolean;
};

/** Hífen sem quebra: "Ar-condicionado" não vira "Ar-" / "condicionado" na coluna estreita. */
const NON_BREAKING_HYPHEN = "\u2011";

const Cell = ({ row, value }: { row: Row; value: string }) => {
  if (row.kind === "text") return <>{value}</>;
  const yes = value === YES;
  return (
    <span className="inline-flex items-center gap-1">
      {yes ? (
        <CheckIcon aria-hidden="true" className="size-4 text-success" />
      ) : (
        <MinusIcon aria-hidden="true" className="size-4 text-fg-subtle" />
      )}
      {value}
    </span>
  );
};

/**
 * Linha da tabela. Quando difere: barra à esquerda e texto para leitor de tela (a diferença nunca
 * é só cor) e, salvo `markerOnly`, faixa `primary-soft` na linha inteira (inclusive o `th` fixo).
 */
export const ComparisonRow = ({ row, roomIds, markerOnly = false }: ComparisonRowProps) => {
  const band = row.differs && !markerOnly;
  return (
    <tr className={band ? "bg-primary-soft" : undefined}>
      <th
        scope="row"
        className={cn(
          "sticky left-0 z-0 min-w-36 px-3 py-3 text-left font-medium break-words hyphens-none text-fg",
          row.differs ? "border-l-4 border-primary" : null,
          band ? "bg-primary-soft" : "bg-surface",
        )}
      >
        {row.label.replaceAll("-", NON_BREAKING_HYPHEN)}
        {row.differs ? <span className="sr-only">, diferente entre os quartos</span> : null}
      </th>
      {row.cells.map((value, index) => (
        <td key={roomIds[index]} className="px-3 py-3 text-fg">
          <Cell row={row} value={value} />
        </td>
      ))}
    </tr>
  );
};
