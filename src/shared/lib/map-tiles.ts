/**
 * Tiles raster do OpenStreetMap: um lugar só para a URL, a origem (CSP e cache do service worker) e o
 * zoom máximo. Produção real usaria um provedor com SLA: troque só estas constantes.
 */
export const TILE_ORIGIN = "https://tile.openstreetmap.org";

/** Modelo de URL do Leaflet (`{z}/{x}/{y}`). */
export const TILE_URL = `${TILE_ORIGIN}/{z}/{x}/{y}.png`;

export const MAX_ZOOM = 19;

/** Página de licença que a atribuição obrigatória do OSM aponta. */
export const OSM_COPYRIGHT_URL = "https://www.openstreetmap.org/copyright";

type TileCoords = { z: number; x: number; y: number };

/** URL de um tile (mapa estático da página do hotel). */
export const tileUrl = ({ z, x, y }: TileCoords): string => `${TILE_ORIGIN}/${z}/${x}/${y}.png`;
