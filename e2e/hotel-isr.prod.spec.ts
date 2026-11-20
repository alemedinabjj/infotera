import { readFileSync } from "node:fs";
import { expect } from "@playwright/test";
import { z } from "zod";
import { hotelPath } from "./helpers/hotel-details";
import { controlledHotel, hotelRequest, hotelRoomsRequest, test } from "./helpers/server-api";

// F7c, critério 11 (ISR). Só contra `next build && next start` (`npm run test:e2e:prod`).
//
// O `next start` do 16.4 não manda `x-nextjs-cache` para rotas com PPR (a spec previa isso em Riscos):
// a página sai como casca prerenderizada + resume (`x-nextjs-postponed: 1`). O critério é provado por
// três fatos: (1) o manifest guarda a revalidação de 60 s e a expiração de 1 h; (2) o hotel responde
// com a casca mesmo com a API presa (não espera a API); (3) se o header existir, não é `MISS`.
// A revalidação em segundo plano depois dos 60 s é manual (ver "Verificação manual" na spec).

const manifestSchema = z.object({
  routes: z.record(
    z.string(),
    z.object({
      initialRevalidateSeconds: z.union([z.number(), z.literal(false)]).optional(),
      initialExpireSeconds: z.number().optional(),
    }),
  ),
});

const hotelRoute = (id: number) => {
  const raw: unknown = JSON.parse(readFileSync(".next/prerender-manifest.json", "utf8"));
  return manifestSchema.parse(raw).routes[`/pt-BR/hotel/${id}`];
};

test.describe("ISR do hotel @prod", () => {
  test("o manifest revalida o hotel a cada 60 s e o deixa expirar em 1 h", () => {
    for (const id of [1, 31, 60]) {
      expect(hotelRoute(id)).toMatchObject({
        initialRevalidateSeconds: 60,
        initialExpireSeconds: 3600,
      });
    }
  });

  test("com a API presa, o hotel prerenderizado abre da casca sem esperar por ela", async ({
    page,
    serverApi,
  }, testInfo) => {
    const hotelId = controlledHotel(testInfo.parallelIndex);
    await serverApi.holdServerRequests(hotelRequest(hotelId));
    await serverApi.holdServerRequests(hotelRoomsRequest(hotelId));

    const response = await page.goto(hotelPath(hotelId));

    expect(response?.status()).toBe(200);
    const headers = response?.headers() ?? {};
    expect(headers["x-nextjs-postponed"]).toBe("1");
    expect(headers["x-nextjs-cache"] ?? "HIT").not.toBe("MISS");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Hotel não encontrado" })).toHaveCount(0);
    await expect(page.getByRole("heading", { level: 2, name: "Avaliações" })).toBeVisible();
  });
});
