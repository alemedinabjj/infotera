import L from "leaflet";
import type { MapMarker } from "./types";

/** O que o marcador desenha (posição, id e rótulo acessível ficam fora do ícone). */
export type DrawnMarker = Pick<MapMarker, "variant" | "text" | "tone">;

const PILL =
  "absolute -translate-x-1/2 -translate-y-1/2 inline-flex min-h-6 items-center whitespace-nowrap " +
  "rounded-full border px-2 text-xs font-semibold shadow-raised group-focus-visible:outline-2 " +
  "group-focus-visible:outline-offset-2 group-focus-visible:outline-focus";

const TONES: Readonly<Record<MapMarker["tone"], string>> = {
  default:
    "border-border bg-surface text-fg group-data-[active=true]:border-primary " +
    "group-data-[active=true]:bg-primary group-data-[active=true]:text-fg-on-primary",
  muted:
    "border-border bg-surface-sunken text-fg-subtle group-data-[active=true]:border-primary " +
    "group-data-[active=true]:text-fg",
};

const PIN =
  "absolute -translate-x-1/2 -translate-y-1/2 block size-6 rounded-full border-2 border-surface " +
  "bg-primary shadow-raised group-focus-visible:outline-2 group-focus-visible:outline-offset-2 " +
  "group-focus-visible:outline-focus";

/**
 * Conteúdo visual do marcador. O texto entra por `textContent` (nunca `innerHTML`): nome e preço
 * vindos da API não viram HTML, então não há XSS por dado de marcador.
 */
export const createMarkerElement = (marker: DrawnMarker): HTMLElement => {
  const element = document.createElement("span");
  element.className = marker.variant === "pin" ? PIN : `${PILL} ${TONES[marker.tone]}`;
  if (marker.variant === "pill") element.textContent = marker.text;
  return element;
};

/**
 * Ícone do Leaflet sobre o elemento acima. O invólucro (`group`) tem tamanho zero e recebe
 * `data-active`, `aria-label` e o foco; o estado ativo é só CSS (`group-data-[active=true]`), então
 * o ícone não é recriado quando o destaque muda.
 */
export const createMarkerIcon = (marker: DrawnMarker): L.DivIcon =>
  L.divIcon({
    html: createMarkerElement(marker),
    className: "group",
    iconSize: [0, 0],
    iconAnchor: [0, 0],
  });

/** Aplica nome acessível e estado ao invólucro do marcador que o Leaflet criou. */
export const decorateMarkerElement = (
  element: HTMLElement | undefined,
  marker: Pick<MapMarker, "id" | "label">,
  active: boolean,
): void => {
  if (!element) return;
  element.setAttribute("aria-label", marker.label);
  element.setAttribute("data-active", String(active));
  element.setAttribute("data-marker-id", marker.id);
};
