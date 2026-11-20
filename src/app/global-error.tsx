"use client";

import "./globals.css";
import { ErrorState } from "@/shared/ui/molecules/ErrorState";

type GlobalErrorProps = { error: unknown; retry: () => void };

const GlobalError = ({ retry }: GlobalErrorProps) => (
  <html lang="pt-BR">
    <body className="min-h-dvh antialiased">
      <title>Algo deu errado | Infotera Hotéis</title>
      <main className="mx-auto w-full max-w-6xl px-4 py-6">
        <ErrorState
          variant="page"
          headingLevel={1}
          title="Algo deu errado"
          description="Tivemos um problema inesperado. Tente de novo em instantes."
          onRetry={retry}
        />
      </main>
    </body>
  </html>
);

export default GlobalError;
