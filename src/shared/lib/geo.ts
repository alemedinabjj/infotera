/** Ponto geográfico em graus. */
export type LatLng = { lat: number; lng: number };

/** Retângulo que contém um conjunto de pontos. */
export type Bounds = { south: number; west: number; north: number; east: number };

/** Margem (px) ao redor dos marcadores quando o mapa enquadra vários pontos. */
export const FIT_PADDING = 32;

/** Zoom máximo ao enquadrar: um hotel isolado não vira um mapa de rua. */
export const FIT_MAX_ZOOM = 15;

/** Menor retângulo que contém todos os pontos (`null` sem pontos). */
export const boundsOf = (points: readonly LatLng[]): Bounds | null => {
  const [first, ...rest] = points;
  if (!first) return null;
  return rest.reduce<Bounds>(
    (bounds, point) => ({
      south: Math.min(bounds.south, point.lat),
      west: Math.min(bounds.west, point.lng),
      north: Math.max(bounds.north, point.lat),
      east: Math.max(bounds.east, point.lng),
    }),
    { south: first.lat, west: first.lng, north: first.lat, east: first.lng },
  );
};

export type FitPlan =
  | { kind: "none" }
  | { kind: "center"; center: LatLng; zoom: number }
  | { kind: "fit"; bounds: Bounds };

/**
 * Como enquadrar os marcadores: nenhum ponto → não mexe; um ponto (ou todos no mesmo lugar) → centra
 * com zoom fixo; vários → ajusta aos limites (o componente aplica margem e zoom máximo).
 */
export const fitPlan = (points: readonly LatLng[]): FitPlan => {
  const bounds = boundsOf(points);
  if (!bounds) return { kind: "none" };
  const isSinglePlace = bounds.south === bounds.north && bounds.west === bounds.east;
  if (isSinglePlace) {
    return { kind: "center", center: { lat: bounds.south, lng: bounds.west }, zoom: FIT_MAX_ZOOM };
  }
  return { kind: "fit", bounds };
};

/** Link "Abrir no OpenStreetMap" com o marcador no ponto. */
export const osmLink = (lat: number, lon: number, zoom = 15): string =>
  `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lon}#map=${zoom}/${lat}/${lon}`;
