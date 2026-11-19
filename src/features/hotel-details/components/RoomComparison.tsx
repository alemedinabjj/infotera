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
import { ComparisonTable } from "./ComparisonTable";

type RoomComparisonProps = { rooms: readonly Room[] };

/** Comparação de todos os quartos (só com 2 ou mais; recolhida por padrão). */
export const RoomComparison = ({ rooms }: RoomComparisonProps) => {
  const [open, setOpen] = useState(false);
  const [onlyDiff, setOnlyDiff] = useState(false);
  const titleId = useId();
  const panelId = useId();
  const { rows } = buildRoomComparison(rooms);
  const visible = onlyDiff ? onlyDifferences(rows) : rows;

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
          <ComparisonTable
            rooms={rooms}
            rows={visible}
            markerOnly={rows.every((row) => row.differs)}
            labelledBy={titleId}
          />
        </div>
      ) : null}
    </div>
  );
};
