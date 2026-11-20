"use client";

import { type ComponentType, useCallback, useEffect, useState } from "react";
import type { InteractiveMapProps } from "./InteractiveMapImpl";
import { loadInteractiveMap } from "./loader";

type MapComponent = ComponentType<InteractiveMapProps>;

export type InteractiveMapLoad =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "error"; retry: () => void }
  | { status: "ready"; Map: MapComponent };

type State =
  | { status: "idle" | "loading" | "error" }
  | { status: "ready"; Component: MapComponent };

/**
 * Pede o chunk do mapa quando `enabled` fica `true` (nunca no carregamento da página). Estados:
 * `loading` (skeleton), `error` (com `retry`, que pede o chunk de novo) e `ready` (o componente).
 */
export const useInteractiveMap = (enabled: boolean): InteractiveMapLoad => {
  const [state, setState] = useState<State>({ status: "idle" });

  const start = useCallback(() => {
    setState((current) => (current.status === "ready" ? current : { status: "loading" }));
    loadInteractiveMap().then(
      (Component) => setState({ status: "ready", Component }),
      () => setState({ status: "error" }),
    );
  }, []);

  useEffect(() => {
    if (enabled) start();
  }, [enabled, start]);

  if (!enabled) return { status: "idle" };
  if (state.status === "error") return { status: "error", retry: start };
  if (state.status === "ready") return { status: "ready", Map: state.Component };
  return { status: "loading" };
};
