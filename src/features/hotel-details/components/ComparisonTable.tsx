import type { Room } from "@/shared/api/schemas";
import type { ComparisonRow as Row } from "../model/room-comparison";
import { ComparisonRow } from "./ComparisonRow";

type ComparisonTableProps = {
  rooms: readonly Room[];
  /** Linhas a mostrar (já filtradas por "só diferenças"). */
  rows: readonly Row[];
  /** Todas as linhas diferem: o destaque é só o marcador (faixa em tudo não diz nada). */
  markerOnly: boolean;
  /** `id` do título que nomeia a região rolável. */
  labelledBy: string;
};

/**
 * Tabela semântica numa região rolável e rotulada: no celular rola **dentro** dela, a página nunca
 * ganha scroll lateral. A primeira coluna é fixa (`sticky`).
 */
export const ComparisonTable = ({ rooms, rows, markerOnly, labelledBy }: ComparisonTableProps) => {
  const roomIds = rooms.map((room) => room.id);
  return (
    <section
      aria-labelledby={labelledBy}
      // biome-ignore lint/a11y/noNoninteractiveTabindex: região rolável precisa ser focável para rolar por teclado
      tabIndex={0}
      className="overflow-x-auto rounded-card border border-border"
    >
      <table className="w-full text-sm tabular-nums">
        <caption className="sr-only">Comparar quartos</caption>
        <thead>
          <tr>
            <th scope="col" className="sticky left-0 z-0 min-w-36 bg-surface px-3 py-3">
              <span className="sr-only">Característica</span>
            </th>
            {rooms.map((room) => (
              <th
                key={room.id}
                scope="col"
                className="min-w-36 px-3 py-3 text-left font-semibold text-fg"
              >
                {room.name}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {rows.length === 0 ? (
            <tr>
              <td colSpan={rooms.length + 1} className="px-3 py-3 text-fg-muted">
                Os quartos têm as mesmas características.
              </td>
            </tr>
          ) : (
            rows.map((row) => (
              <ComparisonRow key={row.key} row={row} roomIds={roomIds} markerOnly={markerOnly} />
            ))
          )}
        </tbody>
      </table>
    </section>
  );
};
