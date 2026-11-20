import { type ReactNode, Suspense } from "react";
import type { SearchCriteria } from "@/shared/lib/search-params";

type StayAwareProps = {
  /** Promessa dos critérios da URL (`searchParams`), criada na página **sem** `await`. */
  criteria: Promise<SearchCriteria | null>;
  /** Monta o conteúdo para os critérios (`null`: sem critérios). */
  children: (criteria: SearchCriteria | null) => ReactNode;
};

const Resolved = async ({ criteria, children }: StayAwareProps) => children(await criteria);

/**
 * Buraco do PPR para o que só muda com a estadia, tipicamente um link ("Resultados", cartões de
 * similares) ou um texto. O fallback é o **mesmo conteúdo sem critérios**: na casca estática o
 * link já funciona (leva ao destino sem datas) e nenhum pixel muda quando os critérios chegam.
 */
export const StayAware = ({ criteria, children }: StayAwareProps) => (
  <Suspense fallback={children(null)}>
    <Resolved criteria={criteria}>{children}</Resolved>
  </Suspense>
);
