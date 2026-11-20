"use client";

import { type ComponentType, useCallback, useEffect, useState } from "react";
import { reloadPage } from "../../lib/navigation";
import type { InteractiveMapProps } from "./InteractiveMapImpl";
import { loadInteractiveMap } from "./loader";

type MapComponent = ComponentType<InteractiveMapProps>;

export type InteractiveMapLoad =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "error"; retry: () => void; retrying: boolean }
  | { status: "ready"; Map: MapComponent };

type State =
  | { status: "idle" | "loading" }
  | { status: "error"; retrying: boolean }
  | { status: "ready"; Component: MapComponent };

/**
 * Pede o chunk do mapa quando `enabled` fica `true` (nunca no carregamento da página). Estados:
 * `loading` (skeleton), `error` (com `retry` e `retrying`) e `ready` (o componente). O `retry` pede o
 * chunk de novo no mesmo lugar (`retrying` enquanto espera); o runtime do Turbopack pode guardar a
 * promessa **rejeitada**, e então a segunda falha recarrega a página (a URL, com `map=1` e os filtros,
 * e o cache da lista seguem).
 */
export const useInteractiveMap = (enabled: boolean): InteractiveMapLoad => {
  const [state, setState] = useState<State>({ status: "idle" });

  const start = useCallback(() => {
    setState((current) => (current.status === "ready" ? current : { status: "loading" }));
    loadInteractiveMap().then(
      (Component) => setState({ status: "ready", Component }),
      () => setState({ status: "error", retrying: false }),
    );
  }, []);

  const retry = useCallback(() => {
    setState({ status: "error", retrying: true });
    loadInteractiveMap().then(
      (Component) => setState({ status: "ready", Component }),
      () => reloadPage(),
    );
  }, []);

  useEffect(() => {
    if (enabled) start();
  }, [enabled, start]);

  if (!enabled) return { status: "idle" };
  if (state.status === "error") return { status: "error", retry, retrying: state.retrying };
  if (state.status === "ready") return { status: "ready", Map: state.Component };
  return { status: "loading" };
};
