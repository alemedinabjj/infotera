import type { ReactNode } from "react";

/** `id` do h1: o formulário o usa como `labelledBy`. */
export const MISSING_DESTINATION_HEADING_ID = "missing-destination-heading";

/** Modo sem destino: a página *é* o formulário de busca (h1, texto e o slot do `SearchForm`). */
export const MissingDestination = ({ children }: { children: ReactNode }) => (
  <div className="mx-auto flex max-w-4xl flex-col gap-8 lg:gap-12">
    <header>
      <h1 id={MISSING_DESTINATION_HEADING_ID} className="text-2xl font-bold text-fg lg:text-3xl">
        Para onde você vai?
      </h1>
      <p className="mt-2 text-fg-muted">
        Escolha um destino para ver hotéis, preços e disponibilidade.
      </p>
    </header>
    {children}
  </div>
);
