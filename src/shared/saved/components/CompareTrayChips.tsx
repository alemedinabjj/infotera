"use client";

import { Button } from "../../ui/atoms/Button";
import { XIcon } from "../../ui/icons";
import { useSavedMessages } from "../hooks/useSavedMessages";
import type { CompareEntry } from "../model/comparison";

type CompareTrayChipsProps = {
  items: readonly CompareEntry[];
  onRemove: (entry: CompareEntry) => void;
};

/** Chips dos hotéis marcados, numa única linha rolável (a partir de `sm` e só com altura
 * folgada: em viewport baixa a bandeja é uma linha só). Nome truncado, nome acessível completo. */
export const CompareTrayChips = ({ items, onRemove }: CompareTrayChipsProps) => {
  const MESSAGES = useSavedMessages().tray;
  return (
    <ul className="hidden gap-2 overflow-x-auto roomy:flex">
      {items.map((entry) => (
        <li key={entry.id} className="shrink-0">
          <Button
            variant="secondary"
            size="sm"
            aria-label={MESSAGES.removeChip(entry.name)}
            rightIcon={<XIcon aria-hidden="true" className="size-4" />}
            onClick={() => onRemove(entry)}
          >
            <span className="max-w-48 truncate">{entry.name}</span>
          </Button>
        </li>
      ))}
    </ul>
  );
};
