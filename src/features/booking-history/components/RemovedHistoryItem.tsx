"use client";

import type { Ref } from "react";
import { Button } from "@/shared/ui";
import { useHistoryMessages } from "../hooks/useHistoryMessages";

type RemovedHistoryItemProps = {
  hotel: string;
  onUndo: () => void;
  undoRef: Ref<HTMLButtonElement>;
};

/** "Fantasma" no lugar da linha removida (a linha original fica por baixo, invisível e inerte). */
export const RemovedHistoryItem = ({ hotel, onUndo, undoRef }: RemovedHistoryItemProps) => {
  const MESSAGES = useHistoryMessages();
  return (
    <div className="col-start-1 row-start-1 flex flex-col items-center justify-center gap-2 rounded-card border border-dashed border-border bg-surface p-4 text-center">
      <p className="text-sm text-fg-muted">{MESSAGES.removed}</p>
      <Button
        ref={undoRef}
        variant="secondary"
        size="sm"
        aria-label={MESSAGES.undoLabel(hotel)}
        onClick={onUndo}
      >
        {MESSAGES.undo}
      </Button>
    </div>
  );
};
