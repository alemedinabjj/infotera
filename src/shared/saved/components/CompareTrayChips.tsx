"use client";

import { Button } from "../../ui/atoms/Button";
import { XIcon } from "../../ui/icons";
import { SAVED_MESSAGES } from "../messages";
import type { CompareEntry } from "../model/comparison";

type CompareTrayChipsProps = {
  items: readonly CompareEntry[];
  onRemove: (entry: CompareEntry) => void;
};

/** Chips dos hotéis marcados (a partir de `sm`): nome truncado, nome acessível completo. */
export const CompareTrayChips = ({ items, onRemove }: CompareTrayChipsProps) => (
  <ul className="hidden flex-wrap gap-2 sm:flex">
    {items.map((entry) => (
      <li key={entry.id}>
        <Button
          variant="secondary"
          size="sm"
          aria-label={SAVED_MESSAGES.tray.removeChip(entry.name)}
          rightIcon={<XIcon aria-hidden="true" className="size-4" />}
          onClick={() => onRemove(entry)}
        >
          <span className="max-w-48 truncate">{entry.name}</span>
        </Button>
      </li>
    ))}
  </ul>
);
