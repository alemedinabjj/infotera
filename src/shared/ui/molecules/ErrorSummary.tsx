"use client";

import { useEffect, useRef } from "react";
import { revealBelowHeader } from "../../lib/scroll";
import { Alert } from "./Alert";
import { describeErrorCount } from "./error-count";

export type ErrorSummaryItem<Id extends string = string> = {
  id: Id;
  label: string;
  message: string;
};

type ErrorSummaryProps<Id extends string> = {
  items: ErrorSummaryItem<Id>[];
  onSelect: (id: Id) => void;
};

/**
 * Resumo no topo do formulário (`role="alert"`): um botão por erro que leva o foco ao campo.
 * Monte com `key` diferente a cada tentativa para ser anunciado de novo.
 */
export const ErrorSummary = <Id extends string>({ items, onSelect }: ErrorSummaryProps<Id>) => {
  const ref = useRef<HTMLDivElement>(null);
  // Depois que o foco levou ao 1º campo inválido, garante que o resumo não ficou escondido acima
  // da dobra ou atrás do header fixo.
  useEffect(() => revealBelowHeader(ref.current), []);

  return (
    <div ref={ref}>
      <Alert tone="danger" title={describeErrorCount(items.length)}>
        <ul className="list-disc pl-5">
          {items.map((item) => (
            <li key={item.id}>
              <button
                type="button"
                onClick={() => onSelect(item.id)}
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
