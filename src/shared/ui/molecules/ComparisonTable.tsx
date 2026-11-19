"use client";

import { type ReactNode, useState } from "react";
import { type ComparisonRow, onlyDifferences } from "../../lib/comparison";
import { Checkbox } from "../atoms/Checkbox";
import { ComparisonTableRow } from "./ComparisonTableRow";

export type ComparisonColumn = { id: number; header: ReactNode };

/** Todo texto vem de quem usa (o módulo tem a microcopy): a molécula não tem texto de negócio. */
export type ComparisonTableMessages = {
  caption: string;
  /** Rótulo sr-only da coluna dos nomes das linhas. */
  cornerLabel: string;
  onlyDifferences: string;
  legend: string;
  scrollHint: string;
  /** Texto sr-only da linha que difere. */
  differs: string;
  /** Quando "só diferenças" não deixa nenhuma linha. */
  empty: string;
  announce: (visible: number, total: number) => string;
};

type ComparisonTableProps = {
  columns: readonly ComparisonColumn[];
  rows: readonly ComparisonRow[];
  messages: ComparisonTableMessages;
  /** `id` do título que nomeia a região rolável; sem ele, a `caption` nomeia. */
  labelledBy?: string;
};

/**
 * Tabela de comparação (DS "Tabela de comparação"): região rolável rotulada e focável (no celular
 * rola **dentro** dela, a página nunca ganha scroll lateral), primeira coluna fixa (`sticky`), linhas
 * que diferem marcadas, "Mostrar só diferenças" com anúncio e selo de texto no melhor valor.
 */
export const ComparisonTable = ({ columns, rows, messages, labelledBy }: ComparisonTableProps) => {
  const [onlyDiff, setOnlyDiff] = useState(false);
  const visible = onlyDiff ? onlyDifferences(rows) : rows;
  const columnIds = columns.map((column) => column.id);

  return (
    <div className="flex flex-col gap-2">
      <Checkbox
        label={messages.onlyDifferences}
        checked={onlyDiff}
        onChange={(event) => setOnlyDiff(event.target.checked)}
      />
      <p className="flex items-center gap-2 text-sm text-fg-muted">
        <span aria-hidden="true" className="h-4 w-1 shrink-0 bg-primary" />
        {messages.legend}
      </p>
      <p className="text-sm text-fg-subtle lg:hidden">{messages.scrollHint}</p>
      <p className="sr-only" aria-live="polite">
        {messages.announce(visible.length, rows.length)}
      </p>
      <section
        aria-labelledby={labelledBy}
        aria-label={labelledBy ? undefined : messages.caption}
        // biome-ignore lint/a11y/noNoninteractiveTabindex: região rolável precisa ser focável para rolar por teclado
        tabIndex={0}
        className="overflow-x-auto rounded-card border border-border"
      >
        <table className="w-full text-sm tabular-nums">
          <caption className="sr-only">{messages.caption}</caption>
          <thead>
            <tr>
              <th scope="col" className="sticky left-0 z-0 min-w-36 bg-surface px-3 py-3">
                <span className="sr-only">{messages.cornerLabel}</span>
              </th>
              {columns.map((column) => (
                <th
                  key={column.id}
                  scope="col"
                  className="min-w-36 px-3 py-3 text-left align-top font-semibold text-fg"
                >
                  {column.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {visible.length === 0 ? (
              <tr>
                <td colSpan={columns.length + 1} className="px-3 py-3 text-fg-muted">
                  {messages.empty}
                </td>
              </tr>
            ) : (
              visible.map((row) => (
                <ComparisonTableRow
                  key={row.key}
                  row={row}
                  columnIds={columnIds}
                  markerOnly={rows.every((item) => item.differs)}
                  differsLabel={messages.differs}
                />
              ))
            )}
          </tbody>
        </table>
      </section>
    </div>
  );
};
