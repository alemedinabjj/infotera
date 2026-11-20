import { expect } from "@playwright/test";
import { hotelPath } from "./helpers/hotel-details";
import { test } from "./helpers/mock-api-server";

// F7c, rodada 4: o React troca o fallback das avaliações pelo `ReviewsPager` com o script inline, antes
// de o JS hidratar. Um clique nesse intervalo se perderia: os botões nascem `disabled` e só habilitam
// depois de hidratar. Os chunks ficam presos por `page.route` (o SW já vem bloqueado pela fixture; ele
// serviria os chunks do precache e furaria o `route`). Só no build: em `next dev` não há PPR.

test.skip(process.env.E2E_PROD !== "1", "só no build: em `next dev` não há prerender nem PPR");

test.describe("paginação das avaliações antes de hidratar @prod", () => {
  test("/hotel/18: os botões ficam desabilitados até os chunks JS chegarem", async ({ page }) => {
    let releaseChunks: () => void = () => undefined;
    const gate = new Promise<void>((resolve) => {
      releaseChunks = resolve;
    });
    let held = 0;
    await page.route(/\/_next\/static\/.*\.js/, async (route) => {
      held += 1;
      await gate;
      await route.continue();
    });

    await page.goto(hotelPath(18), { waitUntil: "commit" });
    const pagination = page.locator("#avaliacoes").getByRole("navigation", { name: "Paginação" });
    const next = pagination.getByRole("button", { name: "Próxima" });
    await expect(next).toBeVisible();
    await expect(next).toBeDisabled();
    expect(held).toBeGreaterThan(0);

    releaseChunks();

    await expect(next).toBeEnabled();
    await next.click();
    await expect(page.locator("#avaliacoes").getByText(/Mostrando 6–10 de/)).toBeVisible();
  });
});
