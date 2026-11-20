import type { BrowserContext } from "@playwright/test";

/** PNG 1×1 cinza (o Leaflet dimensiona o tile por CSS; o conteúdo não importa). */
const TILE_PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR4nGNgYGD4DwABBAEAwS2OUAAAAABJRU5ErkJggg==",
  "base64",
);

const TILE_HOST = "https://tile.openstreetmap.org/";

/** O pedido é para o servidor de tiles do OSM? */
export const isTileRequest = (url: string): boolean => url.startsWith(TILE_HOST);

export type TileLog = {
  /** URLs de tile pedidas pelo navegador (todas interceptadas: nenhuma chega ao OSM). */
  requests: string[];
  /** `abort` derruba todos os pedidos (sem rede para o mapa). */
  mode: "ok" | "abort";
};

/**
 * Intercepta `tile.openstreetmap.org` com um PNG local: a suíte E2E nunca bate no OSM (política de
 * uso) e o teste enxerga cada tile pedido. A resposta leva CORS porque o mapa pede com
 * `crossOrigin="anonymous"`.
 */
export const interceptTiles = async (context: BrowserContext): Promise<TileLog> => {
  const log: TileLog = { requests: [], mode: "ok" };
  await context.route(`${TILE_HOST}**`, async (route) => {
    log.requests.push(route.request().url());
    if (log.mode === "abort") return route.abort();
    return route.fulfill({
      status: 200,
      contentType: "image/png",
      headers: { "access-control-allow-origin": "*" },
      body: TILE_PNG,
    });
  });
  return log;
};

/** Zoom (`z`) do último tile pedido, ou `null` sem pedidos. */
export const lastTileZoom = (log: TileLog): number | null => {
  const url = log.requests.at(-1);
  const match = url ? /openstreetmap\.org\/(\d+)\//.exec(url) : null;
  return match?.[1] ? Number(match[1]) : null;
};
