"use client";

import "./globals.css";
import { commonMessages } from "@/shared/i18n/common/messages";
import { parsePublicPath } from "@/shared/i18n/paths";
import { ErrorState } from "@/shared/ui/molecules/ErrorState";

type GlobalErrorProps = { error: unknown; retry: () => void };

/** Idioma pelo caminho da URL (o layout raiz não existe aqui): `/en/...` é inglês. */
const localeFromLocation = () =>
  typeof window === "undefined" ? "pt-BR" : parsePublicPath(window.location.pathname).locale;

const GlobalError = ({ retry }: GlobalErrorProps) => {
  const locale = localeFromLocation();
  const t = commonMessages.get(locale).routes.globalError;
  return (
    <html lang={locale}>
      <body className="min-h-dvh antialiased">
        <title>{t.metaTitle}</title>
        <main className="mx-auto w-full max-w-6xl px-4 py-6">
          <ErrorState
            variant="page"
            headingLevel={1}
            title={t.title}
            description={t.description}
            onRetry={retry}
          />
        </main>
      </body>
    </html>
  );
};

export default GlobalError;
