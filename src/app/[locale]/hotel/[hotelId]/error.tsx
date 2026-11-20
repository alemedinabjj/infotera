"use client";

import Link from "next/link";
import { buttonClassName, ErrorState } from "@/shared/ui";

type HotelErrorProps = { error: unknown; retry: () => void };

/**
 * Erro inesperado ao abrir o hotel (500, timeout). Só importa `@/shared/ui`: o `index.ts` da
 * feature levaria o código de servidor (`loadHotel`) para o bundle do cliente.
 */
const HotelError = ({ retry }: HotelErrorProps) => (
  <ErrorState
    variant="page"
    headingLevel={1}
    title="Não foi possível abrir o hotel"
    description="Tente de novo ou faça uma nova busca."
    onRetry={retry}
    action={
      <Link href="/" className={buttonClassName({ variant: "ghost" })}>
        Fazer nova busca
      </Link>
    }
  />
);

export default HotelError;
