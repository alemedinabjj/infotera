import { expect, type Page, type Request } from "@playwright/test";
import { cards, searchPath } from "./helpers/hotel-search";
import { test } from "./helpers/mock-api-server";

// F7c, critério 26: o card prefetcha o hotel por intenção (`prefetch={true}` no hover/foco). `"auto"`
// só traz a casca genérica (`next-router-prefetch: 1`); o prefetch completo sai com valor `2` e sem
// `next-router-segment-prefetch`. Só o build prefetcha.

const isHotelPrefetch = (request: Request, level: string): boolean =>
  new URL(request.url()).pathname.startsWith("/hotel/") &&
  request.headers()["next-router-prefetch"] === level;

/** Ids de hotel dos prefetches completos, na ordem em que saíram. */
const collectFullPrefetches = (page: Page): string[] => {
  const ids: string[] = [];
  page.on("request", (request) => {
    if (!isHotelPrefetch(request, "2")) return;
    ids.push(new URL(request.url()).pathname.split("/")[2] ?? "");
  });
  return ids;
};

const hotelIdOf = async (page: Page, position: number): Promise<string> => {
  const href = await cards(page).nth(position).getByRole("link").first().getAttribute("href");
  return new URL(href ?? "", "http://localhost").pathname.split("/")[2] ?? "";
};

const fullPrefetchOf = (page: Page, id: string) =>
  page.waitForRequest(
    (request) =>
      isHotelPrefetch(request, "2") && new URL(request.url()).pathname === `/hotel/${id}`,
  );

const openSearch = async (page: Page) => {
  // O primeiro prefetch `auto` só sai depois de hidratar: serve de sinal de que os handlers existem.
  const hydrated = page.waitForRequest((request) => isHotelPrefetch(request, "1"));
  await page.goto(searchPath());
  await expect(cards(page).first()).toBeVisible();
  await hydrated;
};

test.skip(process.env.E2E_PROD !== "1", "só no build: em `next dev` não há prerender nem prefetch");

test.describe("prefetch por intenção no card @prod", () => {
  test("o mouse sobre um card prefetcha só o hotel dele (critério 26)", async ({ page }) => {
    const full = collectFullPrefetches(page);
    await openSearch(page);
    expect(full).toEqual([]);
    const first = await hotelIdOf(page, 1);
    const second = await hotelIdOf(page, 2);

    const firstRequest = fullPrefetchOf(page, first);
    await cards(page).nth(1).hover();
    await firstRequest;
    const secondRequest = fullPrefetchOf(page, second);
    await cards(page).nth(2).hover();
    await secondRequest;

    // Um prefetch a mais de outro card teria saído antes do segundo.
    expect(full).toEqual([first, second]);
  });

  test("o foco por teclado também prefetcha, e só aquele card", async ({ page }) => {
    const full = collectFullPrefetches(page);
    await openSearch(page);
    expect(full).toEqual([]);
    const target = await hotelIdOf(page, 3);

    const request = fullPrefetchOf(page, target);
    await cards(page).nth(3).getByRole("link").first().focus();
    await request;

    expect(full).toEqual([target]);
  });
});
