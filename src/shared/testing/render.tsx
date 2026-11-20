import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render } from "@testing-library/react";
import { domAnimation, LazyMotion } from "motion/react";
import type { ReactElement } from "react";
import { I18nProvider } from "../i18n/client";
import type { Locale } from "../i18n/config";

type Options = { queryClient?: QueryClient; locale?: Locale };

export const makeTestQueryClient = (): QueryClient =>
  new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: Infinity }, mutations: { retry: false } },
  });

type RenderResultWithClient = ReturnType<typeof render> & { queryClient: QueryClient };

/** Renderiza com `QueryClientProvider` (retry desligado) e `LazyMotion` síncrono para testes de componente. */
export const renderWithProviders = (
  ui: ReactElement,
  { queryClient = makeTestQueryClient(), locale = "pt-BR" }: Options = {},
): RenderResultWithClient => ({
  ...render(
    // Features síncronas: sem elas `m.*` nunca sai do `initial` (opacity 0) nos testes.
    <I18nProvider locale={locale}>
      <QueryClientProvider client={queryClient}>
        <LazyMotion features={domAnimation} strict>
          {ui}
        </LazyMotion>
      </QueryClientProvider>
    </I18nProvider>,
  ),
  queryClient,
});
