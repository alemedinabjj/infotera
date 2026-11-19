"use client";

import { Alert } from "@/shared/ui";
import { describeErrorCount, type SummaryField, type SummaryItem } from "../model/error-summary";

type ErrorSummaryProps = {
  items: SummaryItem[];
  onSelect: (field: SummaryField) => void;
};

/** Resumo no topo do card (`role="alert"`): um botão por erro que leva o foco ao campo. */
export const ErrorSummary = ({ items, onSelect }: ErrorSummaryProps) => (
  <Alert tone="danger" title={describeErrorCount(items.length)}>
    <ul className="list-disc pl-5">
      {items.map((item) => (
        <li key={item.field}>
          <button
            type="button"
            onClick={() => onSelect(item.field)}
            className="min-h-11 py-2 text-left text-primary underline"
          >
            {item.label}: {item.message}
          </button>
        </li>
      ))}
    </ul>
  </Alert>
);
