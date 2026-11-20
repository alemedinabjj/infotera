import { expect, type Page, test } from "@playwright/test";
import { analyzeAccessibility } from "./helpers/axe";

test.describe("manifest e ícones", () => {
  test("o manifest é válido e os ícones respondem 200 image/png", async ({ request }) => {
    const response = await request.get("/manifest.webmanifest");
    expect(response.status()).toBe(200);
    const manifest = await response.json();
    expect(manifest).toMatchObject({
      name: "Infotera Hotéis",
      short_name: "Infotera",
      start_url: "/",
      display: "standalone",
      theme_color: "#0b5cad",
      background_color: "#f4f6f9",
    });
    const icons: { src: string; sizes: string; purpose?: string }[] = manifest.icons;
    expect(icons.map((icon) => icon.sizes)).toEqual(["192x192", "512x512", "512x512"]);
    expect(icons.some((icon) => icon.purpose === "maskable")).toBe(true);
    for (const icon of icons) {
      const image = await request.get(icon.src);
      expect(image.status(), icon.src).toBe(200);
      expect(image.headers()["content-type"]).toContain("image/png");
      expect((await image.body()).byteLength).toBeGreaterThan(100);
    }
  });

  test("o ícone da Apple e o theme-color estão no HTML", async ({ request }) => {
    const apple = await request.get("/apple-icon");
    expect(apple.status()).toBe(200);
    expect(apple.headers()["content-type"]).toContain("image/png");
    const html = await (await request.get("/")).text();
    expect(html).toContain('name="theme-color" content="#0b5cad"');
    expect(html).toContain('rel="manifest"');
    expect(html).toContain('rel="apple-touch-icon"');
  });
});

test.describe("cartão de instalação", () => {
  test.beforeEach(({ isMobile }) => {
    test.skip(isMobile, "o evento de instalação é testado no desktop");
  });

  /**
   * Dispara o evento do Chromium até o app o receber: o listener vive no módulo do layout e o HTML do
   * servidor aparece antes do JavaScript. `preventDefault()` no listener é o sinal de que ele já existe.
   */
  const fireInstallPrompt = async (page: Page) => {
    await page.waitForFunction(() => {
      const event = new Event("beforeinstallprompt", { cancelable: true });
      Object.assign(event, {
        prompt: () => {
          Reflect.set(
            window,
            "__installPrompts",
            Number(Reflect.get(window, "__installPrompts") ?? 0) + 1,
          );
          return Promise.resolve();
        },
        userChoice: Promise.resolve({ outcome: "accepted" }),
      });
      window.dispatchEvent(event);
      return event.defaultPrevented;
    });
  };
  const card = (page: Page) => page.getByRole("heading", { name: "Instale o Infotera Hotéis" });

  test("aparece com o evento; 'Agora não' esconde por 30 dias e sobrevive ao reload", async ({
    page,
  }) => {
    await page.goto("/");
    await expect(card(page)).toHaveCount(0);
    await fireInstallPrompt(page);
    await expect(card(page)).toBeVisible();
    await page.getByRole("button", { name: "Agora não" }).click();
    await expect(card(page)).toHaveCount(0);
    const stored = await page.evaluate(() => localStorage.getItem("infotera:install-dismissed-at"));
    expect(stored).toMatch(/^"\d{4}-\d{2}-\d{2}T/);
    await page.reload();
    await fireInstallPrompt(page);
    await expect(card(page)).toHaveCount(0);
  });

  test("'Instalar' chama prompt() e appinstalled mostra o toast", async ({ page }) => {
    await page.goto("/");
    await fireInstallPrompt(page);
    await page.getByRole("button", { name: "Instalar" }).click();
    await expect(card(page)).toHaveCount(0);
    expect(await page.evaluate(() => Reflect.get(window, "__installPrompts"))).toBe(1);
    await page.evaluate(() => window.dispatchEvent(new Event("appinstalled")));
    await expect(page.getByText("App instalado.")).toBeVisible();
  });

  test("em inglês o cartão vem em inglês e não tem violações de acessibilidade", async ({
    page,
  }) => {
    await page.goto("/en");
    await fireInstallPrompt(page);
    await expect(page.getByRole("heading", { name: "Install Infotera Hotéis" })).toBeVisible();
    const results = await analyzeAccessibility(page);
    expect(results.violations).toEqual([]);
  });
});
