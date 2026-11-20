import type { Locator, Page } from "@playwright/test";

/** Chaves de storage da F7a. */
export const FAVORITES_KEY = "infotera:favorites";
export const COMPARISON_KEY = "infotera:comparison";
export const HISTORY_KEY = "infotera:booking-history";

/** Grava um valor JSON no `localStorage` antes de qualquer script da página (só na 1ª carga). */
export const seedStorage = async (page: Page, key: string, value: unknown): Promise<void> => {
  await page.addInitScript(
    ({ key: storageKey, value: stored }) => {
      if (window.sessionStorage.getItem("seeded") === storageKey) return;
      window.localStorage.setItem(storageKey, JSON.stringify(stored));
      window.sessionStorage.setItem("seeded", storageKey);
    },
    { key, value },
  );
};

/** Estado persistido do Zustand (`{ version, state: { items } }`). */
export const persisted = (items: unknown[]) => ({ version: 1, state: { items } });

export const favoriteEntry = (id: number, day = 1) => ({
  id,
  addedAt: `2026-11-${String(day).padStart(2, "0")}T10:00:00.000Z`,
});

export const readStorage = (page: Page, key: string): Promise<unknown> =>
  page.evaluate((storageKey) => {
    const raw = localStorage.getItem(storageKey);
    return raw === null ? null : JSON.parse(raw);
  }, key);

/** Sem rolagem horizontal no documento. */
export const noHorizontalScroll = (page: Page): Promise<boolean> =>
  page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth);

/** `top` da bandeja de comparação (ou `null` se não está na tela). */
export const trayTop = async (page: Page): Promise<number | null> => {
  const box = await page.locator("[data-bottom-bar]").boundingBox();
  return box ? box.y : null;
};

/** O link "Favoritos" do cabeçalho (contador incluso no nome acessível em < sm). */
export const favoritesLink = (page: Page): Locator =>
  page.getByRole("banner").getByRole("link", { name: /^Favoritos/ });
