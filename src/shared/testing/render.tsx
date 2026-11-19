import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render } from "@testing-library/react";
import { domAnimation, LazyMotion } from "motion/react";
import type { ReactElement } from "react";

type Options = { queryClient?: QueryClient };

export const makeTestQueryClient = (): QueryClient =>
  new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: Infinity }, mutations: { retry: false } },
  });

type RenderResultWithClient = ReturnType<typeof render> & { queryClient: QueryClient };

/** Renderiza com `QueryClientProvider` (retry desligado) e `LazyMotion` síncrono para testes de componente. */
export const renderWithProviders = (
  ui: ReactElement,
  { queryClient = makeTestQueryClient() }: Options = {},
): RenderResultWithClient => ({
  ...render(
    // Features síncronas: sem elas `m.*` nunca sai do `initial` (opacity 0) nos testes.
    <QueryClientProvider client={queryClient}>
      <LazyMotion features={domAnimation} strict>
        {ui}
      </LazyMotion>
    </QueryClientProvider>,
  ),
  queryClient,
});
