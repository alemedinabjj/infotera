"use client";

import { useId } from "react";
import { Checkbox } from "../../ui/atoms/Checkbox";
import { VisuallyHidden } from "../../ui/atoms/VisuallyHidden";
import { useCompareActions } from "../hooks/useCompareActions";
import { SAVED_MESSAGES } from "../messages";
import { MAX_COMPARE } from "../model/comparison";
import { useComparison } from "../stores/comparison";

const MESSAGES = SAVED_MESSAGES.compare;

type CompareCheckboxProps = { hotelId: number; hotelName: string; className?: string };

/**
 * "Comparar" (checkbox controlado). Com o limite atingido, o não marcado fica `aria-disabled`
 * (continua focável e explica o motivo) e clicar não marca: mostra o toast do limite.
 */
export const CompareCheckbox = ({ hotelId, hotelName, className }: CompareCheckboxProps) => {
  const items = useComparison();
  const { toggle } = useCompareActions();
  const hintId = useId();
  const checked = items.some((entry) => entry.id === hotelId);
  const blocked = !checked && items.length >= MAX_COMPARE;

  return (
    <>
      <Checkbox
        className={className}
        label={MESSAGES.label}
        aria-label={MESSAGES.ariaLabel(hotelName)}
        checked={checked}
        aria-disabled={blocked ? true : undefined}
        aria-describedby={blocked ? hintId : undefined}
        onChange={() => toggle({ id: hotelId, name: hotelName })}
      />
      {blocked ? <VisuallyHidden id={hintId}>{MESSAGES.limitHint}</VisuallyHidden> : null}
    </>
  );
};
