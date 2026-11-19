import type { ReactNode } from "react";

/**
 * Grupo de filtro: `fieldset` com `legend` visível (leitor de tela anuncia o grupo). O respiro
 * entre grupos fica no `div` de fora: o padding de um `fieldset` não conta para a `legend`, e o
 * espaço entre ela e a primeira opção precisa ser o mesmo em todos os grupos.
 */
export const FilterGroup = ({ legend, children }: { legend: string; children: ReactNode }) => (
  <div className="py-5 first:pt-0 last:pb-0">
    <fieldset className="min-w-0">
      <legend className="mb-2 text-base font-semibold text-fg">{legend}</legend>
      {children}
    </fieldset>
  </div>
);
