import { test as base, expect } from "@playwright/test";
import { interceptTiles, type TileLog } from "./helpers/tiles";

/**
 * `test` da F7b: igual ao do Playwright, mais a fixture automática `tiles` (tiles do OSM
 * interceptados e contados). Os specs de mapa importam daqui.
 */
export const test = base.extend<{ tiles: TileLog }>({
  tiles: [
    async ({ context }, use) => {
      await use(await interceptTiles(context));
    },
    { auto: true },
  ],
});

export { expect };
