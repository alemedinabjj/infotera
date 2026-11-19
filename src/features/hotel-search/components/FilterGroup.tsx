import type { ReactNode } from "react";

/** Grupo de filtro: `fieldset` com `legend` visível (leitor de tela anuncia o grupo). */
export const FilterGroup = ({ legend, children }: { legend: string; children: ReactNode }) => (
  <fieldset className="min-w-0 py-5 first:pt-0 last:pb-0">
    <legend className="mb-2 text-base font-semibold text-fg">{legend}</legend>
    {children}
  </fieldset>
);
