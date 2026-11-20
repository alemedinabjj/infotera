import { cn } from "../../lib/cn";

type MapHintProps = {
  /** O mesmo id do `hintId` do mapa (o contêiner o usa em `aria-describedby`). */
  id: string;
  text: string;
  /** Sem mapa interativo ainda, a linha continua reservada, mas vazia. */
  active?: boolean;
};

/**
 * Dica de teclado do mapa, **abaixo** da moldura e em fluxo (nunca sobre o mapa). A linha é sempre
 * reservada (`min-h-5`, sem layout shift) e só fica visível com foco de teclado dentro do wrapper
 * `group/map`; o leitor de tela a ouve sempre, pelo `aria-describedby` do mapa.
 */
export const MapHint = ({ id, text, active = true }: MapHintProps) => (
  <p
    id={id}
    className={cn(
      "mt-2 min-h-5 text-xs text-fg-muted opacity-0 transition-opacity duration-150",
      "group-has-[:focus-visible]/map:opacity-100",
    )}
  >
    {active ? text : null}
  </p>
);
