"use client";

import Link from "next/link";
import { buttonClassName, ErrorState } from "@/shared/ui";

type SearchErrorProps = { error: unknown; retry: () => void };

/** Erro inesperado da rota (a lista tem a própria boundary e não chega aqui). */
const SearchError = ({ retry }: SearchErrorProps) => (
  <ErrorState
    variant="page"
    headingLevel={1}
    title="Não foi possível abrir a busca"
    description="Tente de novo ou faça uma nova busca."
    onRetry={retry}
    action={
      <Link href="/" className={buttonClassName({ variant: "ghost" })}>
        Fazer nova busca
      </Link>
    }
  />
);

export default SearchError;
