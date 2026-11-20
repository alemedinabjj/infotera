"use client";

import { useId, useState } from "react";
import type { Room } from "@/shared/api/schemas";
import { cn } from "@/shared/lib/cn";
import { ChevronDownIcon, ComparisonTable } from "@/shared/ui";
import { buildRoomComparison, ROOM_COMPARISON_MESSAGES } from "../model/room-comparison";

type RoomComparisonProps = { rooms: readonly Room[] };

/** Comparação de todos os quartos (só com 2 ou mais; recolhida por padrão). */
export const RoomComparison = ({ rooms }: RoomComparisonProps) => {
  const [open, setOpen] = useState(false);
  const titleId = useId();
  const panelId = useId();
  const { rows } = buildRoomComparison(rooms);

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
        <div id={panelId}>
          <ComparisonTable
            columns={rooms.map((room) => ({ id: room.id, header: room.name }))}
            rows={rows}
            messages={ROOM_COMPARISON_MESSAGES}
            labelledBy={titleId}
          />
        </div>
      ) : null}
    </div>
  );
};
