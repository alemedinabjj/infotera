"use client";

import "./globals.css";
import { useEffect, useState } from "react";
import { commonMessages } from "@/shared/i18n/common/messages";
import type { Locale } from "@/shared/i18n/config";
import { parsePublicPath } from "@/shared/i18n/paths";
import { ErrorState } from "@/shared/ui/molecules/ErrorState";

type GlobalErrorProps = { error: unknown; retry: () => void };

/**
 * Idioma pelo caminho da URL (o layout raiz não existe aqui): `/en/...` é inglês. Lido num efeito:
 * a primeira pintura é pt-BR e só então troca, sem ler `window` durante o render.
 */
const useLocaleFromLocation = (): Locale => {
  const [locale, setLocale] = useState<Locale>("pt-BR");
  useEffect(() => setLocale(parsePublicPath(window.location.pathname).locale), []);
  return locale;
};

const GlobalError = ({ retry }: GlobalErrorProps) => {
  const locale = useLocaleFromLocation();
  const t = commonMessages.get(locale).routes.globalError;
  return (
    <html lang={locale}>
      <body className="min-h-dvh antialiased">
        <title>{t.metaTitle}</title>
        <main className="mx-auto w-full max-w-6xl px-4 py-6">
          <ErrorState
            locale={locale}
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
