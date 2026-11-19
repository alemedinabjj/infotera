export type GeoPoint = { latitude: number; longitude: number };

const EARTH_RADIUS_KM = 6371;

const toRadians = (degrees: number): number => (degrees * Math.PI) / 180;

/**
 * "Centro" do destino: média aritmética de latitude/longitude dos hotéis. Vale para regiões de poucos
 * km (não atravessa antimeridiano nem polos). Com menos de 2 pontos não há centro que informe algo.
 */
export const computeCentroid = (points: readonly GeoPoint[]): GeoPoint | null => {
  if (points.length < 2) return null;
  const sum = points.reduce(
    (acc, item) => ({
      latitude: acc.latitude + item.latitude,
      longitude: acc.longitude + item.longitude,
    }),
    { latitude: 0, longitude: 0 },
  );
  return { latitude: sum.latitude / points.length, longitude: sum.longitude / points.length };
};

/** Distância em linha reta (haversine) em km. */
export const distanceKm = (a: GeoPoint, b: GeoPoint): number => {
  const dLat = toRadians(b.latitude - a.latitude);
  const dLon = toRadians(b.longitude - a.longitude);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(a.latitude)) * Math.cos(toRadians(b.latitude)) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(h)));
};

/** Mais perto primeiro; empate (ou sem centro) desempata por `id`. Não muta a entrada. */
export const sortByDistance = <T extends GeoPoint & { id: number }>(
  items: readonly T[],
  center: GeoPoint | null,
): T[] => {
  if (center === null) return [...items].sort((a, b) => a.id - b.id);
  const distances = new Map(items.map((item) => [item.id, distanceKm(center, item)]));
  return [...items].sort(
    (a, b) => (distances.get(a.id) ?? 0) - (distances.get(b.id) ?? 0) || a.id - b.id,
  );
};

const numberFormat = (fractionDigits: number): Intl.NumberFormat =>
  new Intl.NumberFormat("pt-BR", {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  });

/**
 * Texto do card. Abaixo de 1 km arredonda para 50 m; de 1 km em diante, uma casa (inteiro a partir
 * de 10 km). A unidade é escolhida depois de arredondar (0,975 km vira `1,0 km`; 9,96 km vira `10 km`).
 */
export const formatDistanceFromCenter = (km: number): string => {
  const meters = Math.round((km * 1000) / 50) * 50;
  if (meters < 100) return "a menos de 100 m do centro";
  if (meters < 1000) return `${numberFormat(0).format(meters)} m do centro`;
  const tenths = Math.round(km * 10) / 10;
  return tenths < 10
    ? `${numberFormat(1).format(tenths)} km do centro`
    : `${numberFormat(0).format(Math.round(km))} km do centro`;
};

/** Fatia 1-based; página fora do intervalo devolve lista vazia. */
export const slicePage = <T>(items: readonly T[], page: number, size: number): T[] =>
  items.slice((page - 1) * size, page * size);
