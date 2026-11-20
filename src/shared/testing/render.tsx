import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render } from "@testing-library/react";
import type { ReactElement } from "react";

type Options = { queryClient?: QueryClient };

export const makeTestQueryClient = (): QueryClient =>
  new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: Infinity }, mutations: { retry: false } },
  });

type RenderResultWithClient = ReturnType<typeof render> & { queryClient: QueryClient };

/** Renderiza com `QueryClientProvider` (retry desligado) para testes de componente. */
export const renderWithProviders = (
  ui: ReactElement,
  { queryClient = makeTestQueryClient() }: Options = {},
): RenderResultWithClient => ({
  ...render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>),
  queryClient,
});
