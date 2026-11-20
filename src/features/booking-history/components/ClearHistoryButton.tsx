"use client";

import { useState } from "react";
import {
  type BookingHistoryEntry,
  clearBookingHistory,
  restoreBookingHistory,
} from "@/shared/lib/booking-history";
import { Button, Dialog, toast } from "@/shared/ui";
import { useHistoryMessages } from "../hooks/useHistoryMessages";

type ClearHistoryButtonProps = {
  entries: readonly BookingHistoryEntry[];
  /** Depois de limpar: leva o foco ao título (o botão some com a lista). */
  onCleared: () => void;
  /** Depois de desfazer a limpeza: a lista volta a ser lida do storage. */
  onRestored: () => void;
};

/** "Limpar histórico" com confirmação em Dialog; confirmar mostra o toast com Desfazer. */
export const ClearHistoryButton = ({ entries, onCleared, onRestored }: ClearHistoryButtonProps) => {
  const ALL = useHistoryMessages();
  const CLEAR = ALL.clear;
  const [open, setOpen] = useState(false);

  const confirm = () => {
    const previous = [...entries];
    clearBookingHistory();
    setOpen(false);
    onCleared();
    toast.info(CLEAR.done, {
      key: "history:clear",
      action: {
        label: ALL.undo,
        onClick: () => {
          restoreBookingHistory(previous);
          onRestored();
        },
        // A lista volta e o botão "Limpar" é outro elemento: o foco vai ao título da página.
        returnFocus: () => document.getElementById("history-title"),
      },
    });
  };

  return (
    <>
      <Button variant="ghost" onClick={() => setOpen(true)}>
        {CLEAR.open}
      </Button>
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title={CLEAR.title}
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setOpen(false)}>
              {CLEAR.cancel}
            </Button>
            <Button variant="danger" onClick={confirm}>
              {CLEAR.confirm}
            </Button>
          </>
        }
      >
        <p className="text-fg-muted">{CLEAR.description}</p>
      </Dialog>
    </>
  );
};
