import { cn } from "@/shared/lib/cn";
import { CheckIcon, MinusIcon } from "@/shared/ui";
import { type ComparisonRow as Row, YES } from "../model/room-comparison";

type ComparisonRowProps = {
  row: Row;
  /** `id` de cada quarto, na ordem das células (chaves estáveis). */
  roomIds: readonly number[];
};

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
 * Linha da tabela. Quando difere: faixa `primary-soft` na linha inteira (inclusive o `th` fixo),
 * barra à esquerda e texto para leitor de tela: a diferença nunca é só cor.
 */
export const ComparisonRow = ({ row, roomIds }: ComparisonRowProps) => (
  <tr className={row.differs ? "bg-primary-soft" : undefined}>
    <th
      scope="row"
      className={cn(
        "sticky left-0 z-0 min-w-28 px-3 py-3 text-left font-medium text-fg",
        row.differs ? "border-l-4 border-primary bg-primary-soft" : "bg-surface",
      )}
    >
      {row.label}
      {row.differs ? <span className="sr-only">, diferente entre os quartos</span> : null}
    </th>
    {row.cells.map((value, index) => (
      <td key={roomIds[index]} className="px-3 py-3 text-fg">
        <Cell row={row} value={value} />
      </td>
    ))}
  </tr>
);
