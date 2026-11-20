import { expect } from "@playwright/test";
import { test } from "./fixtures";

// "Não encontrado" sem JavaScript. Sob `cacheComponents` o Next responde todo `notFound()` com
// `<html id="__next_error__">` e corpo vazio (o conteúdo só no cliente). As rotas renderizam o "não encontrado"
// inline (`200` + `noindex`) e o HTML sai do servidor já na 1ª visita: header, h1, link de saída e título
// corretos sem executar JS. Os ids `61` e `999` não estão no `generateStaticParams`. Só no build: em `next dev`
// o corpo é streamado.

test.skip(process.env.E2E_PROD !== "1", "só no build: em `next dev` não há prerender");
test.use({ javaScriptEnabled: false });

type Case = { path: string; h1: string; link: string; href: string; title: string };

const HOTEL: Omit<Case, "path"> = {
  h1: "Hotel não encontrado",
  link: "Fazer nova busca",
  href: "/",
  title: "Hotel não encontrado | Infotera Hotéis",
};
const PHOTO: Omit<Case, "path"> = {
  h1: "Foto não encontrada",
  link: "Ver o hotel",
  href: "/hotel/1",
  title: "Foto não encontrada | Infotera Hotéis",
};

const CASES: Case[] = [
  { path: "/hotel/61", ...HOTEL },
  { path: "/hotel/999", ...HOTEL },
  { path: "/hotel/abc", ...HOTEL },
  { path: "/hotel/999/photos/1", ...HOTEL },
  { path: "/hotel/1/photos/9", ...PHOTO },
  { path: "/hotel/1/photos/abc", ...PHOTO },
  {
    path: "/rota-inexistente",
    h1: "Página não encontrada",
    link: "Voltar para a busca",
    href: "/",
    title: "Página não encontrada | Infotera Hotéis",
  },
  {
    path: "/en/hotel/999",
    h1: "Hotel not found",
    link: "Start a new search",
    href: "/en",
    title: "Hotel not found | Infotera Hotéis",
  },
  {
    path: "/en/rota-inexistente",
    h1: "Page not found",
    link: "Back to search",
    href: "/en",
    title: "Page not found | Infotera Hotéis",
  },
];

test.describe("não encontrado sem JavaScript @prod", () => {
  for (const { path, h1, link, href, title } of CASES) {
    test(`${path}: header, h1, link e título no HTML do servidor`, async ({ page }) => {
      const response = await page.goto(path);

      expect(response?.status()).toBe(200);
      await expect(page.getByRole("banner")).toBeVisible();
      await expect(page.getByRole("heading", { level: 1, name: h1 })).toBeVisible();
      await expect(page.getByRole("link", { name: link })).toHaveAttribute("href", href);
      await expect(page).toHaveTitle(title);
      await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", "noindex");
    });
  }
});
