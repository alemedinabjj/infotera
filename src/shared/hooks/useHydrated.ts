import { useSyncExternalStore } from "react";

const subscribe = (): (() => void) => () => undefined;

/**
 * `false` durante a hidratação (o React usa o snapshot do servidor) e `true` depois, só no cliente.
 * Serve para o primeiro render do cliente bater com o HTML do servidor quando o dado vem de uma fonte
 * que só o cliente tem (cache de consultas restaurado do `localStorage`), mesmo em fronteiras de
 * Suspense que hidratam depois da raiz.
 */
export const useHydrated = (): boolean =>
  useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
