import type { ComponentType } from "react";
import type { InteractiveMapProps } from "./InteractiveMapImpl";

type MapComponent = ComponentType<InteractiveMapProps>;

let pending: Promise<MapComponent> | null = null;

/**
 * Carrega o mapa (Leaflet + react-leaflet + CSS) sob demanda, num chunk próprio. A promessa fica em
 * cache; se o chunk falhar, o cache é limpo para o "Tentar de novo" pedir de novo.
 */
export const loadInteractiveMap = (): Promise<MapComponent> => {
  pending ??= import("./InteractiveMapImpl")
    .then((module) => module.InteractiveMapImpl)
    .catch((error: unknown) => {
      pending = null;
      throw error;
    });
  return pending;
};
