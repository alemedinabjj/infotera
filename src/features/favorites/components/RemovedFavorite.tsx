"use client";

import type { Ref } from "react";
import { Button } from "@/shared/ui";
import { useFavoritesMessages } from "../hooks/useFavoritesMessages";

type RemovedFavoriteProps = {
  name: string;
  onUndo: () => void;
  undoRef: Ref<HTMLButtonElement>;
};

/** "Fantasma" no lugar do card removido: mesmo tamanho (o card original fica por baixo, invisível). */
export const RemovedFavorite = ({ name, onUndo, undoRef }: RemovedFavoriteProps) => {
  const MESSAGES = useFavoritesMessages();
  return (
    <div className="col-start-1 row-start-1 flex flex-col items-center justify-center gap-2 rounded-card border border-dashed border-border bg-surface p-4 text-center">
      <p className="text-sm text-fg-muted">{MESSAGES.removed}</p>
      <Button
        ref={undoRef}
        variant="secondary"
        size="sm"
        aria-label={MESSAGES.undoLabel(name)}
        onClick={onUndo}
      >
        {MESSAGES.undo}
      </Button>
    </div>
  );
};
