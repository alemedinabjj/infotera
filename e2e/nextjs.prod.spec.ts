import { readFileSync } from "node:fs";
import { expect } from "@playwright/test";
import { z } from "zod";
import { hotelPath, roomCard } from "./helpers/hotel-details";
import { test } from "./helpers/mock-api-server";

// Só contra `next build && next start` (`npm run test:e2e:prod`): em `next dev` não há prerender.

const manifestSchema = z.object({
  routes: z.record(z.string(), z.object({ htmlSize: z.number().optional() })),
});

const manifest = () => {
  const raw: unknown = JSON.parse(readFileSync(".next/prerender-manifest.json", "utf8"));
  return manifestSchema.parse(raw).routes;
};

test.describe("prerender manifest @prod", () => {
  test("os 60 hotéis foram prerenderizados; checkout e confirmação nunca", () => {
    const routes = manifest();
    for (let id = 1; id <= 60; id += 1) {
      expect(routes[`/pt-BR/hotel/${id}`]?.htmlSize ?? 0).toBeGreaterThan(0);
    }
    // `/checkout` é casca vazia de propósito (nonce da CSP por request): entra no manifest sem HTML.
    expect(routes["/pt-BR/checkout"]?.htmlSize).toBe(0);
    expect(Object.keys(routes).filter((route) => route.includes("/confirmation/"))).toEqual([]);
  });
});

test.describe("hotel sem JavaScript: a casca estática @prod", () => {
  test.use({ javaScriptEnabled: false });

  test("nome, foto, quartos, diárias, 'a partir de', comentários e similares no HTML; buracos em skeleton", async ({
    page,
  }) => {
    await page.goto(hotelPath(1));
    await expect(
      page.getByRole("heading", { level: 1, name: "Hotel Copacabana Palace" }),
    ).toBeVisible();
    await expect(page.getByRole("link", { name: "Abrir foto 1 de 5" })).toBeVisible();
    await expect(page.getByText("a partir de R$ 800 por noite")).toBeVisible();
    const suite = roomCard(page, "Suíte Deluxe Ocean View");
    await expect(suite).toContainText("R$ 1.200 por noite, sem taxas");
    await expect(page.getByRole("button", { name: /Comparar quartos/ })).toBeVisible();
    await expect(page.getByRole("heading", { level: 2, name: "Avaliações" })).toBeVisible();
    // Similares e comentários da 1ª página vêm do cache, já no HTML e visíveis (não no segmento oculto).
    await expect(
      page
        .getByRole("region", { name: /Hotéis similares/ })
        .getByRole("link")
        .first(),
    ).toBeVisible();
    // Os buracos da estadia mostram skeleton `aria-hidden`, nunca o botão "Selecionar quarto".
    await expect(suite.getByRole("button", { name: /Selecionar quarto/ })).toHaveCount(0);
    await expect(suite.locator("[aria-hidden='true'].animate-none").first()).toBeAttached();
  });

  // Fica pendente: a página cheia da foto é de outra frente (mesmo problema do segmento outlined).
  test.fixme("a miniatura leva à página cheia da foto", async ({ page }) => {
    await page.goto(hotelPath(1));
    await page.getByRole("link", { name: "Ver todas as fotos (5)" }).click();
    await expect(
      page.getByRole("heading", { level: 1, name: "Fotos de Hotel Copacabana Palace" }),
    ).toBeVisible();
  });
});

test.describe("hotel com JavaScript @prod", () => {
  test("total e botão entram no lugar do skeleton sem mover nada acima de Quartos (CLS 0)", async ({
    page,
  }) => {
    await page.addInitScript(() => {
      const shifts: number[] = [];
      Object.assign(window, { __shifts: shifts });
      new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (!Reflect.get(entry, "hadRecentInput"))
            shifts.push(Number(Reflect.get(entry, "value")));
        }
      }).observe({ type: "layout-shift", buffered: true });
    });
    await page.goto(hotelPath(1));
    const suite = roomCard(page, "Suíte Deluxe Ocean View");
    await expect(suite.getByRole("button", { name: /Selecionar quarto/ })).toBeVisible();
    await expect(suite).toContainText("total com taxas");
    await expect(page.getByRole("button", { name: "Alterar datas e hóspedes" })).toBeVisible();
    const shifts = await page.evaluate(() => Reflect.get(window, "__shifts"));
    expect(
      Array.isArray(shifts) ? shifts.reduce((a: number, b: number) => a + b, 0) : 0,
    ).toBeLessThan(0.1);
  });

  test("sem critérios: 'Escolha as datas' e 'Escolher datas' em cada quarto", async ({ page }) => {
    await page.goto(hotelPath(1, false));
    await expect(
      page.locator("#main-content").getByText("Escolha as datas para reservar"),
    ).toBeVisible();
    await expect(
      roomCard(page, "Suíte Deluxe Ocean View").getByRole("button", { name: /Escolher datas/ }),
    ).toBeVisible();
  });

  test("hotel fora do build (61) e id inválido: não encontrado", async ({ page }) => {
    await page.goto("/hotel/61");
    await expect(page.getByRole("heading", { name: "Hotel não encontrado" })).toBeVisible();
    await page.goto("/hotel/abc");
    await expect(page.getByRole("heading", { name: "Hotel não encontrado" })).toBeVisible();
  });
});
