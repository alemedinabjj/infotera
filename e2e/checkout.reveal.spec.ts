import { expect, type Locator, type Page, type Route } from "@playwright/test";
import {
  acceptTermsViaDialog,
  clickPrimary,
  criteria,
  goToReview,
  seedSelection,
} from "./helpers/checkout";
import { headerHeight } from "./helpers/hotel-details";
import { test } from "./helpers/mock-api-server";

const VIEWPORTS = [
  { width: 320, height: 568 },
  { width: 375, height: 667 },
];

const isAction = (route: Route): boolean =>
  route.request().method() === "POST" && route.request().headers()["next-action"] !== undefined;

/** O bloco está inteiro entre o header e a barra de ação fixa (ou o fim da janela)? */
const expectInUsableArea = async (page: Page, block: Locator) => {
  const header = await headerHeight(page);
  await expect
    .poll(async () => {
      const bar = await page.locator("[data-action-bar]").evaluate((el) => ({
        top: el.getBoundingClientRect().top,
        fixed: getComputedStyle(el).position === "fixed",
      }));
      const limit = bar.fixed ? bar.top : window.innerHeight;
      const box = await block.evaluate((el) => {
        const { top, bottom } = el.getBoundingClientRect();
        return { top, bottom };
      });
      return box.top >= header - 1 && box.bottom <= limit + 1;
    })
    .toBe(true);
};

test.beforeEach(async ({ page, isMobile }) => {
  test.skip(isMobile, "viewports próprios abaixo");
  await seedSelection(page, { hotelId: 1, roomId: 1, criteria: criteria() });
});

for (const viewport of VIEWPORTS) {
  test.describe(`${viewport.width}px`, () => {
    test.beforeEach(async ({ page }) => {
      await page.setViewportSize(viewport);
      await page.goto("/checkout");
      await page.getByRole("heading", { level: 2, name: "Dados dos hóspedes" }).waitFor();
      await goToReview(page, { companions: [{ first: "Bruno", last: "Souza" }] });
    });

    test("o alerta da 1ª falha aparece inteiro acima da barra fixa", async ({ page }) => {
      await acceptTermsViaDialog(page);
      await page.route("**/checkout", (route) =>
        isAction(route) ? route.abort() : route.fallback(),
      );
      await clickPrimary(page, "Confirmar reserva");
      const alert = page
        .getByRole("alert")
        .filter({ hasText: "Não foi possível confirmar sua reserva" });
      await expect(alert).toBeVisible();
      await expectInUsableArea(page, alert);
    });

    test("o erro dos termos revela o campo inteiro, não só o checkbox", async ({ page }) => {
      await clickPrimary(page, "Confirmar reserva");
      await expect(page.getByRole("checkbox", { name: /Li e aceito os termos/ })).toBeFocused();
      const field = page.locator("[data-reveal-block]").filter({ hasText: "aceite os termos" });
      await expectInUsableArea(page, field);
    });

    test("voltar pelo stepper revela o título com 'Passo N de 3'", async ({ page }) => {
      await page.getByRole("button", { name: "Hóspedes, concluído" }).click();
      const heading = page.getByRole("heading", { level: 2, name: "Dados dos hóspedes" });
      await expect(heading).toBeFocused();
      await expectInUsableArea(page, page.getByText("Passo 1 de 3"));
      await expectInUsableArea(page, heading);
    });
  });
}
