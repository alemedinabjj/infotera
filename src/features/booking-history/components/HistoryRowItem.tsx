"use client";

import { m, useReducedMotion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import type { Hotel } from "@/shared/api/schemas";
import { removeFromHistory, restoreBookingHistory } from "@/shared/lib/booking-history";
import { cn } from "@/shared/lib/cn";
import { focusWhenReady } from "@/shared/lib/focus";
import { motionPreset, staggerDelay } from "@/shared/lib/motion";
import { Button } from "@/shared/ui";
import { useHistoryMessages } from "../hooks/useHistoryMessages";
import type { HistoryRow } from "../model/history-rows";
import { HistoryItem } from "./HistoryItem";
import { HistoryItemFailed, HistoryItemSkeleton } from "./HistoryItemStates";
import { RemovedHistoryItem } from "./RemovedHistoryItem";

type HotelLookup = { state: "loading" | "ready" | "unavailable"; hotels: readonly Hotel[] };

type HistoryRowItemProps = {
  row: HistoryRow;
  index: number;
  /** O id ainda está guardado (se não, a linha virou "fantasma"). */
  kept: boolean;
  hotels: HotelLookup;
  retrying: boolean;
  /** Sem conexão: só o aviso global; a linha fica como placeholder, sem erro vermelho. */
  offline: boolean;
  onRetry: () => void;
};

type FocusTarget = "undo" | "remove" | null;

const Content = ({
  row,
  hotels,
  retrying,
  offline,
  onRetry,
  removeButton,
}: Omit<HistoryRowItemProps, "index" | "kept"> & {
  removeButton: (label?: string) => React.ReactNode;
}) => {
  switch (row.kind) {
    case "found": {
      const hotel = hotels.hotels.find((item) => item.id === row.booking.hotelId);
      const state = hotels.state === "ready" && !hotel ? "unavailable" : hotels.state;
      return (
        <HistoryItem booking={row.booking} hotel={{ state, hotel }} removeButton={removeButton} />
      );
    }
    case "pending":
    case "missing":
      return <HistoryItemSkeleton />;
    case "failed":
      // Sem conexão o aviso global já explica: nada de erro vermelho por linha.
      if (offline) return <HistoryItemSkeleton />;
      return (
        <HistoryItemFailed
          unreadable={false}
          retrying={retrying}
          onRetry={onRetry}
          removeButton={removeButton()}
        />
      );
    case "unreadable":
      return (
        <HistoryItemFailed
          unreadable
          retrying={retrying}
          onRetry={onRetry}
          removeButton={removeButton()}
        />
      );
    default: {
      const unreachable: never = row;
      return unreachable;
    }
  }
};

/**
 * Uma linha do histórico. Remover troca o conteúdo por um "fantasma" na mesma célula (altura
 * idêntica, nada abaixo se move); o foco vai a "Desfazer" e, ao desfazer, volta a "Remover".
 */
export const HistoryRowItem = ({
  row,
  index,
  kept,
  hotels,
  retrying,
  offline,
  onRetry,
}: HistoryRowItemProps) => {
  const MESSAGES = useHistoryMessages();
  const preset = motionPreset("list-item", useReducedMotion() ?? false);
  const [focus, setFocus] = useState<FocusTarget>(null);
  const undoRef = useRef<HTMLButtonElement>(null);
  const removeRef = useRef<HTMLButtonElement>(null);

  // Só foca quando o alvo já existe e não está inerte (o storage pode chegar depois do clique).
  useEffect(() => {
    if (focus === null || (focus === "undo") === kept) return;
    // O alvo acabou de sair de `invisible`/`inert`: espera o navegador deixar focar.
    return focusWhenReady(
      () => (focus === "undo" ? undoRef : removeRef).current,
      () => setFocus(null),
    );
  }, [focus, kept]);

  const removeButton = (label?: string) => (
    <Button
      ref={removeRef}
      variant="ghost"
      size="sm"
      aria-label={label}
      onClick={() => {
        removeFromHistory(row.entry.id);
        setFocus("undo");
      }}
    >
      {MESSAGES.remove}
    </Button>
  );
  const hotel =
    row.kind === "found"
      ? hotels.hotels.find((item) => item.id === row.booking.hotelId)
      : undefined;
  const name =
    row.kind === "found" ? (hotel?.name ?? MESSAGES.hotelUnavailable) : MESSAGES.thisBooking;

  return (
    <m.li
      initial={preset.initial}
      animate={preset.animate}
      transition={{ ...preset.transition, delay: staggerDelay(index) }}
      className="grid"
    >
      <div
        className={cn(
          "col-start-1 row-start-1 overflow-hidden rounded-card border border-border bg-surface shadow-card",
          !kept && "invisible",
        )}
        inert={!kept}
      >
        <Content
          row={row}
          hotels={hotels}
          retrying={retrying}
          offline={offline}
          onRetry={onRetry}
          removeButton={removeButton}
        />
      </div>
      {kept ? null : (
        <RemovedHistoryItem
          hotel={name}
          undoRef={undoRef}
          onUndo={() => {
            restoreBookingHistory([row.entry]);
            setFocus("remove");
          }}
        />
      )}
    </m.li>
  );
};
