"use client";

import { useState } from "react";
import {
  type BookingHistoryEntry,
  clearBookingHistory,
  restoreBookingHistory,
} from "@/shared/lib/booking-history";
import { Button, Dialog, toast } from "@/shared/ui";
import { HISTORY_MESSAGES } from "../model/messages";

const MESSAGES = HISTORY_MESSAGES.clear;

type ClearHistoryButtonProps = {
  entries: readonly BookingHistoryEntry[];
  /** Depois de limpar: leva o foco ao título (o botão some com a lista). */
  onCleared: () => void;
  /** Depois de desfazer a limpeza: a lista volta a ser lida do storage. */
  onRestored: () => void;
};

/** "Limpar histórico" com confirmação em Dialog; confirmar mostra o toast com Desfazer. */
export const ClearHistoryButton = ({ entries, onCleared, onRestored }: ClearHistoryButtonProps) => {
  const [open, setOpen] = useState(false);

  const confirm = () => {
    const previous = [...entries];
    clearBookingHistory();
    setOpen(false);
    onCleared();
    toast.info(MESSAGES.done, {
      key: "history:clear",
      action: {
        label: HISTORY_MESSAGES.undo,
        onClick: () => {
          restoreBookingHistory(previous);
          onRestored();
        },
      },
    });
  };

  return (
    <>
      <Button variant="ghost" onClick={() => setOpen(true)}>
        {MESSAGES.open}
      </Button>
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title={MESSAGES.title}
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setOpen(false)}>
              {MESSAGES.cancel}
            </Button>
            <Button variant="danger" onClick={confirm}>
              {MESSAGES.confirm}
            </Button>
          </>
        }
      >
        <p className="text-fg-muted">{MESSAGES.description}</p>
      </Dialog>
    </>
  );
};
