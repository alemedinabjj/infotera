import { test as base, expect } from "@playwright/test";
import { interceptTiles, isTileRequest, type TileLog } from "./helpers/tiles";

/**
 * `test` da suíte: igual ao do Playwright, mais a fixture automática `tiles` (tiles do OSM
 * interceptados e contados). **Todo spec importa `test` daqui** (Biome proíbe o de
 * `@playwright/test`, critério 47): a suíte nunca bate em `tile.openstreetmap.org`.
 *
 * - `serviceWorkers: "block"` por padrão: `page.route`/`context.route` não enxergam requests feitos
 *   por um service worker, que furariam a interceptação. Quem testa o SW (`pwa.build.spec`) liga
 *   com `test.use({ serviceWorkers: "allow" })`.
 * - Mesmo assim, ao fim de cada teste a fixture falha se o navegador pediu um tile que a
 *   interceptação não viu (ex.: pedido de um SW liberado).
 */
export const test = base.extend<{ tiles: TileLog }>({
  serviceWorkers: "block",
  tiles: [
    async ({ context }, use) => {
      const log = await interceptTiles(context);
      const seen: string[] = [];
      context.on("request", (request) => {
        if (isTileRequest(request.url())) seen.push(request.url());
      });
      await use(log);
      const leaked = seen.length - log.requests.length;
      expect(
        leaked,
        `${leaked} pedido(s) a tile.openstreetmap.org escaparam da interceptação`,
      ).toBe(0);
    },
    { auto: true },
  ],
});

export { expect };
