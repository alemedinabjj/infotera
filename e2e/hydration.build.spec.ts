import { expect, test } from "./fixtures";

// Só contra o build de produção (a hidratação do dev é mais ruidosa e o SSG com rewrite é do build):
//   npm run build && npx next start -p 3911
//   PLAYWRIGHT_BASE_URL=http://localhost:3911 npx playwright test e2e/hydration.build.spec.ts
// `/[locale]/favorites` é estático e o proxy o reescreve: o pathname do servidor difere do cliente.

test.skip(!process.env.PLAYWRIGHT_BASE_URL, "hidratação do SSG só no build de produção");
test.beforeEach(({ isMobile }) => {
  test.skip(isMobile, "roda no desktop");
});

const HYDRATION = /hydrat|did not match|didn't match/i;

for (const [path, label] of [
  ["/favorites", "Favoritos"],
  ["/en/favorites", "Favorites"],
] as const) {
  test(`${path}: item atual marcado com aria-current="page" e sem aviso de hidratação`, async ({
    page,
  }) => {
    const problems: string[] = [];
    page.on("console", (message) => {
      if (["error", "warning"].includes(message.type()) && HYDRATION.test(message.text())) {
        problems.push(message.text());
      }
    });
    page.on("pageerror", (error) => {
      if (HYDRATION.test(error.message)) problems.push(error.message);
    });
    await page.goto(path);
    const link = page.getByRole("navigation").getByRole("link", { name: new RegExp(label) });
    await expect(link).toHaveAttribute("aria-current", "page");
    await page.waitForLoadState("networkidle");
    expect(problems).toEqual([]);
  });
}
