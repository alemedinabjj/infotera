const TILE_SIZE = 256;
const MAX_LATITUDE = 85.0511;

export type MapTile = {
  z: number;
  x: number;
  y: number;
  /** Posição e tamanho do tile em % do canvas. */
  leftPct: number;
  topPct: number;
  sizePct: { w: number; h: number };
};

export type StaticMap = {
  tiles: MapTile[];
  marker: { leftPct: number; topPct: number };
};

type StaticMapInput = { lat: number; lon: number; zoom: number; width: number; height: number };

const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value));

/** Projeção Web Mercator (EPSG:3857, a mesma do Leaflet/OSM) em pixels do mundo no zoom dado. */
const toWorldPixels = (lat: number, lon: number, zoom: number): { x: number; y: number } => {
  const scale = TILE_SIZE * 2 ** zoom;
  const radians = (clamp(lat, -MAX_LATITUDE, MAX_LATITUDE) * Math.PI) / 180;
  const x = ((lon + 180) / 360) * scale;
  const y = ((1 - Math.log(Math.tan(radians) + 1 / Math.cos(radians)) / Math.PI) / 2) * scale;
  return { x, y };
};

const range = (from: number, to: number): number[] =>
  Array.from({ length: to - from + 1 }, (_, i) => from + i);

/**
 * Monta o mapa estático: os tiles do OpenStreetMap que cobrem um canvas `width × height` centrado
 * no ponto, com posições em % (o canvas é responsivo) e o marcador no ponto.
 */
export const staticMapLayout = ({ lat, lon, zoom, width, height }: StaticMapInput): StaticMap => {
  const center = toWorldPixels(lat, lon, zoom);
  const left = center.x - width / 2;
  const top = center.y - height / 2;
  const tilesPerSide = 2 ** zoom;

  const columns = range(Math.floor(left / TILE_SIZE), Math.floor((left + width) / TILE_SIZE));
  const rows = range(Math.floor(top / TILE_SIZE), Math.floor((top + height) / TILE_SIZE));

  const tiles = rows
    .filter((row) => row >= 0 && row < tilesPerSide)
    .flatMap((row) =>
      columns.map(
        (column): MapTile => ({
          z: zoom,
          // O mundo se repete na horizontal: a coluna -1 é a última.
          x: ((column % tilesPerSide) + tilesPerSide) % tilesPerSide,
          y: row,
          leftPct: ((column * TILE_SIZE - left) / width) * 100,
          topPct: ((row * TILE_SIZE - top) / height) * 100,
          sizePct: { w: (TILE_SIZE / width) * 100, h: (TILE_SIZE / height) * 100 },
        }),
      ),
    );

  return {
    tiles,
    marker: {
      leftPct: ((center.x - left) / width) * 100,
      topPct: ((center.y - top) / height) * 100,
    },
  };
};
