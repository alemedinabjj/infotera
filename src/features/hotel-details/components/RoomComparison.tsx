"use client";

import { useId, useState } from "react";
import type { Room } from "@/shared/api/schemas";
import { cn } from "@/shared/lib/cn";
import { Checkbox, ChevronDownIcon } from "@/shared/ui";
import {
  buildRoomComparison,
  comparisonAnnouncement,
  onlyDifferences,
} from "../model/room-comparison";
import { ComparisonRow } from "./ComparisonRow";

type RoomComparisonProps = { rooms: readonly Room[] };

/**
 * Comparação de todos os quartos (só com 2 ou mais; recolhida por padrão). Tabela semântica numa
 * região rolável e rotulada: no celular rola **dentro** dela, a página nunca ganha scroll lateral.
 */
export const RoomComparison = ({ rooms }: RoomComparisonProps) => {
  const [open, setOpen] = useState(false);
  const [onlyDiff, setOnlyDiff] = useState(false);
  const titleId = useId();
  const panelId = useId();
  const { rows } = buildRoomComparison(rooms);
  const visible = onlyDiff ? onlyDifferences(rows) : rows;
  const roomIds = rooms.map((room) => room.id);

  return (
    <div id="comparar-quartos" className="flex flex-col gap-2">
      <h3 id={titleId}>
        <button
          type="button"
          aria-expanded={open}
          aria-controls={panelId}
          onClick={() => setOpen((current) => !current)}
          className="inline-flex min-h-11 items-center gap-2 text-lg font-semibold text-fg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
        >
          Comparar quartos ({rooms.length})
          <ChevronDownIcon
            aria-hidden="true"
            className={cn("size-5 transition-transform", open && "rotate-180")}
          />
        </button>
      </h3>
      {open ? (
        <div id={panelId} className="flex flex-col gap-2">
          <Checkbox
            label="Mostrar só diferenças"
            checked={onlyDiff}
            onChange={(event) => setOnlyDiff(event.target.checked)}
          />
          <p className="flex items-center gap-2 text-sm text-fg-muted">
            <span aria-hidden="true" className="h-4 w-1 shrink-0 bg-primary" />
            Linhas marcadas mudam entre os quartos.
          </p>
          <p className="text-sm text-fg-subtle lg:hidden">Arraste para o lado para ver todos.</p>
          <p className="sr-only" aria-live="polite">
            {comparisonAnnouncement(visible.length, rows.length)}
          </p>
          <section
            aria-labelledby={titleId}
            // biome-ignore lint/a11y/noNoninteractiveTabindex: região rolável precisa ser focável para rolar por teclado
            tabIndex={0}
            className="overflow-x-auto rounded-card border border-border"
          >
            <table className="w-full text-sm tabular-nums">
              <caption className="sr-only">Comparar quartos</caption>
              <thead>
                <tr>
                  <th scope="col" className="sticky left-0 z-0 min-w-28 bg-surface px-3 py-3">
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
                {visible.length === 0 ? (
                  <tr>
                    <td colSpan={rooms.length + 1} className="px-3 py-3 text-fg-muted">
                      Os quartos têm as mesmas características.
                    </td>
                  </tr>
                ) : (
                  visible.map((row) => <ComparisonRow key={row.key} row={row} roomIds={roomIds} />)
                )}
              </tbody>
            </table>
          </section>
        </div>
      ) : null}
    </div>
  );
};
