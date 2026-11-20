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
 * - Mesmo assim, ao fim de cada teste a fixture falha se um tile foi servido ao navegador sem
 *   passar pela interceptação (fora de um SW). Quem libera o SW também corta o OSM na rede
 *   (`--host-resolver-rules`), então os pedidos dele falham em vez de chegar ao servidor real.
 */
export const test = base.extend<{ tiles: TileLog }>({
  serviceWorkers: "block",
  tiles: [
    async ({ context }, use) => {
      const log = await interceptTiles(context);
      const seen: string[] = [];
      // `requestfinished`: um pedido que falha (rede cortada) não chegou ao OSM e não conta.
      // Resposta de um SW não conta: o `route` não a vê e o OSM está cortado na rede (ver acima).
      context.on("requestfinished", async (request) => {
        if (!isTileRequest(request.url())) return;
        const response = await request.response();
        if (!response?.fromServiceWorker()) seen.push(request.url());
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
