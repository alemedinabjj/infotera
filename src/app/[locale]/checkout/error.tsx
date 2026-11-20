"use client";

import Link from "next/link";
import { buttonClassName, ErrorState } from "@/shared/ui";

/** Erro inesperado ao abrir o checkout. Só importa `@/shared/ui`. */
const CheckoutError = ({ retry }: { error: unknown; retry: () => void }) => (
  <ErrorState
    variant="page"
    headingLevel={1}
    title="Não foi possível abrir o checkout"
    description="Tente de novo ou faça uma nova busca. Nada foi cobrado."
    onRetry={retry}
    action={
      <Link href="/" className={buttonClassName({ variant: "ghost" })}>
        Fazer nova busca
      </Link>
    }
  />
);

export default CheckoutError;
