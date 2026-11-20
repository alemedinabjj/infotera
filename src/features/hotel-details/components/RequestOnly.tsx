import { connection } from "next/server";
import { type ReactNode, Suspense } from "react";

/** Exportado só para o teste: o RTL não renderiza Server Component assíncrono. */
export const AfterConnection = async ({ children }: { children: ReactNode }) => {
  await connection();
  return children;
};

type RequestOnlyProps = {
  children: ReactNode;
  /** O que a casca estática mostra no lugar (padrão: nada). */
  fallback?: ReactNode;
};

/**
 * Só renderiza por request: `await connection()` adia o conteúdo para depois do prerender, então ele
 * **nunca** entra na casca estática. É o lugar do ramo de erro de dado do servidor: uma falha de
 * quartos ou de comentários não pode ficar gravada no HTML que todo mundo recebe do cache.
 */
export const RequestOnly = ({ children, fallback = null }: RequestOnlyProps) => (
  <Suspense fallback={fallback}>
    <AfterConnection>{children}</AfterConnection>
  </Suspense>
);
