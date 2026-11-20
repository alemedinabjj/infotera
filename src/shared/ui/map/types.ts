import type { LatLng } from "../../lib/geo";

/** Marcador genérico (o mapa não sabe o que é hotel). Tudo aqui é texto, nunca HTML. */
export type MapMarker = {
  id: string;
  position: LatLng;
  /** `pill`: pílula com texto (preço); `pin`: ponto sem texto (um lugar só). */
  variant: "pill" | "pin";
  /** Texto visível da pílula (ex.: `R$ 1.200` ou `Esgotado`). */
  text: string;
  /** Nome acessível do marcador (ex.: `Hotel X, R$ 1.200 por noite`). */
  label: string;
  /** `muted` = indisponível (esgotado). */
  tone: "default" | "muted";
};

/** Textos do mapa, já no idioma da página. */
export type MapLabels = {
  /** Nome da região do mapa (`aria-label` do contêiner focável). */
  region: string;
  /** Dica visível de teclado, ligada por `aria-describedby`. */
  hint: string;
  zoomIn: string;
  zoomOut: string;
  closePopup: string;
  attribution: string;
};
