import { useMemo, useSyncExternalStore } from "react";
import { vi } from "vitest";

/**
 * Mock de `next/navigation` para testes de componente. A URL é a do `window.location` (jsdom);
 * `useSearchParams` reage a `pushState`, `replaceState` e `popstate`, como o Next 16 faz com a
 * History API nativa. Uso:
 *
 * ```ts
 * vi.mock("next/navigation", async () => (await import("@/shared/testing/next-navigation")).navigationMock);
 * setTestUrl("/search?destination=Rio");
 * expect(navigationSpies.push).toHaveBeenCalledWith("/search?...");
 * ```
 */

const LOCATION_CHANGE = "test:locationchange";
let patched = false;

/** Faz `pushState`/`replaceState` avisarem os assinantes (o jsdom não dispara evento algum). */
const patchHistory = (): void => {
  if (patched) return;
  patched = true;
  const { pushState, replaceState } = window.history;
  window.history.pushState = (data, unused, url) => {
    pushState.call(window.history, data, unused, url);
    window.dispatchEvent(new Event(LOCATION_CHANGE));
  };
  window.history.replaceState = (data, unused, url) => {
    replaceState.call(window.history, data, unused, url);
    window.dispatchEvent(new Event(LOCATION_CHANGE));
  };
};

const subscribe = (notify: () => void): (() => void) => {
  patchHistory();
  window.addEventListener(LOCATION_CHANGE, notify);
  window.addEventListener("popstate", notify);
  return () => {
    window.removeEventListener(LOCATION_CHANGE, notify);
    window.removeEventListener("popstate", notify);
  };
};

/** Define a URL atual (antes do `render`). Aceita caminho com query (`/search?page=2`). */
export const setTestUrl = (url: string): void => {
  patchHistory();
  window.history.replaceState(null, "", url);
};

const navigate = (mode: "push" | "replace", href: string): void => {
  patchHistory();
  if (mode === "push") window.history.pushState(null, "", href);
  else window.history.replaceState(null, "", href);
};

/** Espiões do router: `push`/`replace` também atualizam a URL do jsdom. */
export const navigationSpies = {
  push: vi.fn((href: string) => navigate("push", href)),
  replace: vi.fn((href: string) => navigate("replace", href)),
  back: vi.fn(() => window.history.back()),
  forward: vi.fn(() => window.history.forward()),
  refresh: vi.fn(),
  prefetch: vi.fn(),
};

const useSearchParams = (): URLSearchParams => {
  const search = useSyncExternalStore(
    subscribe,
    () => window.location.search,
    () => "",
  );
  return useMemo(() => new URLSearchParams(search), [search]);
};

const usePathname = (): string =>
  useSyncExternalStore(
    subscribe,
    () => window.location.pathname,
    () => "/",
  );

const useRouter = () => navigationSpies;

/** Objeto para o `vi.mock("next/navigation", ...)`. */
export const navigationMock = { useSearchParams, usePathname, useRouter };
