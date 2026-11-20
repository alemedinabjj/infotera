"use client";

import { useEffect, useRef } from "react";
import { revealBelowHeader } from "@/shared/lib/scroll";
import { Alert } from "@/shared/ui";
import { describeErrorCount, type SummaryField, type SummaryItem } from "../model/error-summary";

type ErrorSummaryProps = {
  items: SummaryItem[];
  onSelect: (field: SummaryField) => void;
};

/** Resumo no topo do card (`role="alert"`): um botão por erro que leva o foco ao campo. */
export const ErrorSummary = ({ items, onSelect }: ErrorSummaryProps) => {
  const ref = useRef<HTMLDivElement>(null);
  // Montado a cada tentativa (`key`): depois que o foco levou ao 1º campo inválido, garante que o
  // resumo não ficou escondido acima da dobra ou atrás do header fixo.
  useEffect(() => revealBelowHeader(ref.current), []);

  return (
    <div ref={ref}>
      <Alert tone="danger" title={describeErrorCount(items.length)}>
        <ul className="list-disc pl-5">
          {items.map((item) => (
            <li key={item.field}>
              <button
                type="button"
                onClick={() => onSelect(item.field)}
                className="block min-h-11 w-full py-2 text-left text-primary underline"
              >
                {item.label}: {item.message}
              </button>
            </li>
          ))}
        </ul>
      </Alert>
    </div>
  );
};
