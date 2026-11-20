import { expect, test } from "@playwright/test";

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
