import { expect, type Locator, type Page } from "@playwright/test";
import { bookingPath, createBooking } from "./helpers/booking";
import {
  clickPrimary,
  criteria,
  fillPayment,
  fillPersonal,
  futureExpiry,
  seedSelection,
} from "./helpers/checkout";
import { cards, searchPath } from "./helpers/hotel-search";
import { test } from "./helpers/mock-api-server";

// F7c, critérios 21, 22, 24 e 25. Com `cacheComponents` o Next não desmonta a rota que o usuário deixou:
// esconde (`<Activity mode="hidden">`) e a restaura no Voltar. Só o build mostra o ciclo completo.
//
// Por que os testes do cartão esperam (`expect.poll`) em vez de ler uma vez: o React esconde a rota (`display: none`)
// e só depois roda o cleanup do layout effect que apaga os campos (`useResetOnHide`). Medido em `next dev`: no
// instante em que a home aparece, o cartão ainda estava no DOM em 4 de 12 execuções e sumia 12-26 ms depois, sempre
// com a rota já invisível (`checkVisibility() === false`). Nada é restaurado nem recriado: é só a ordem do commit
// (esconder, depois apagar), mais lenta no dev. Para o usuário o cartão nunca fica visível nem persistido; o critério
// (campos vazios com a rota escondida) é o mesmo, só a leitura aguarda esse commit.

const PAYMENT_FIELDS = [
  "payment.cardNumber",
  "payment.cardName",
  "payment.expiry",
  "payment.cvv",
  "payment.document",
] as const;

// Rio com piscina: 7 hotéis (a mock-api tem dados fixos).
const ITEMS = 7;

const logo = (page: Page): Locator => page.getByRole("banner").getByRole("link").first();

/**
 * Segue o link do logo por um clique sintético. Com um `<dialog>` modal aberto o header fica inerte
 * (o mouse não o alcança), mas a navegação por link continua possível (ex.: atalho, leitor de tela).
 */
const followLogo = (page: Page) =>
  logo(page).evaluate((link) => link instanceof HTMLElement && link.click());

/** Valores dos inputs do pagamento direto no DOM (a rota escondida continua anexada, só sem exibição). */
const paymentValues = (page: Page) =>
  page.evaluate((names) => {
    const found = names.map((name) => document.querySelector(`input[name="${name}"]`));
    return found.map((input) => (input instanceof HTMLInputElement ? input.value : null));
  }, PAYMENT_FIELDS);

const goToPayment = async (page: Page) => {
  await seedSelection(page, { hotelId: 1, roomId: 1, criteria: criteria() });
  await page.goto("/checkout");
  await fillPersonal(page, { companions: [{ first: "Bruno", last: "Souza" }] });
  await clickPrimary(page, "Continuar para pagamento");
  await page.getByRole("heading", { level: 2, name: "Pagamento" }).waitFor();
};

test.describe("checkout: o cartão não fica no DOM escondido @prod", () => {
  test.beforeEach(({ isMobile }) => {
    test.skip(isMobile, "o fluxo do cartão roda no desktop");
  });

  test("ao sair pelo logo, nada do formulário (cartão nem hóspedes) fica no documento; o Voltar traz um checkout novo (critério 22)", async ({
    page,
  }) => {
    await goToPayment(page);
    await fillPayment(page);
    expect(await paymentValues(page)).not.toContain("");

    await logo(page).click();
    await expect(page).toHaveURL(/\/$/);
    await expect(page.getByRole("button", { name: "Buscar hotéis" })).toBeVisible();

    // A rota do checkout foi desmontada (`WipeOnHide`): nenhum campo, nem vazio, sobra no documento.
    await expect.poll(() => paymentValues(page)).toEqual(PAYMENT_FIELDS.map(() => null));
    const typed = () =>
      page.evaluate(() =>
        Array.from(document.querySelectorAll("input"))
          .map((input) => input.value)
          .filter((value) => /Bruno|Ana|ana@exemplo/.test(value)),
      );
    await expect.poll(typed).toEqual([]);

    await page.goBack();
    await expect(page).toHaveURL(/\/checkout$/);
    // Começa de novo: passo dos hóspedes, sem o que foi digitado.
    await expect(page.getByRole("heading", { level: 2, name: "Pagamento" })).toBeHidden();
    const holder = page.getByRole("group", { name: "Hóspede 1 · titular da reserva" });
    await expect(holder.getByLabel("Nome", { exact: true })).toHaveValue("");
    await expect(page.getByLabel("Número do cartão")).toHaveCount(0);
  });

  test("o resumo do cartão na revisão sai do DOM ao esconder a rota e o Voltar começa um checkout novo (critério 22)", async ({
    page,
  }) => {
    await goToPayment(page);
    await fillPayment(page);
    await clickPrimary(page, "Revisar reserva");
    await page.getByRole("heading", { level: 2, name: "Revise e confirme" }).waitFor();
    await expect(page.getByText(/^Visa •••• 1111/)).toBeVisible();
    const secrets = ["•••• 1111", futureExpiry(), "ANA SOUZA", "982.247"];
    const html = () => page.evaluate(() => document.body.innerHTML);
    for (const secret of secrets) expect(await html()).toContain(secret);

    await logo(page).click();
    await expect(page).toHaveURL(/\/$/);
    await expect(page.getByRole("button", { name: "Buscar hotéis" })).toBeVisible();
    // A rota some do documento: nada do cartão pode ter ficado no texto dela.
    for (const secret of secrets) await expect.poll(html).not.toContain(secret);

    await page.goBack();
    await expect(page).toHaveURL(/\/checkout$/);
    await expect(page.getByRole("heading", { level: 2, name: "Revise e confirme" })).toBeHidden();
    await expect(page.getByLabel("Número do cartão")).toHaveCount(0);
    await expect(page.getByText(/Visa •••• 1111/)).toHaveCount(0);
  });

  test("o termo de aceite aberto aparece fechado ao voltar (critério 25)", async ({ page }) => {
    await goToPayment(page);
    await fillPayment(page);
    await clickPrimary(page, "Revisar reserva");
    await page.getByRole("heading", { level: 2, name: "Revise e confirme" }).waitFor();
    await page.getByRole("button", { name: "Ler termos e condições" }).click();
    const terms = page.getByRole("dialog", { name: "Termos e condições da reserva" });
    await expect(terms).toBeVisible();

    await followLogo(page);
    await expect(page).toHaveURL(/\/$/);
    await page.goBack();
    await expect(page).toHaveURL(/\/checkout$/);
    // O checkout é desmontado ao sair: o termo não volta aberto (nem o cartão, critério 22).
    await expect(terms).toBeHidden();
    await expect(page.getByLabel("Número do cartão")).toHaveCount(0);
  });
});

test.describe("confirmação: a reserva não fica no DOM escondido @prod", () => {
  test("ao sair, o documento não guarda hóspedes, e-mail nem número da reserva; o Voltar a traz de volta", async ({
    page,
    request,
  }) => {
    const id = await createBooking(request);
    await page.goto(bookingPath(id));
    await expect(page.getByRole("heading", { level: 1, name: "Reserva confirmada" })).toBeVisible();
    // Sem os `<script>`: no carregamento direto o HTML traz o payload RSC inline (`self.__next_f.push`), inerte e
    // idêntico ao "ver código-fonte". O que o teste cobre é a árvore de elementos que o Activity preserva.
    const html = () =>
      page.evaluate(() => {
        const clone = document.body.cloneNode(true);
        if (clone instanceof HTMLElement)
          for (const node of clone.querySelectorAll("script")) node.remove();
        return clone instanceof HTMLElement ? clone.innerHTML : "";
      });
    const secrets = ["Ana Souza", "Bruno Souza", "a***@exemplo.com", id, "Cartão final 1111"];
    for (const secret of secrets) await expect.poll(html).toContain(secret);

    await logo(page).click();
    await expect(page).toHaveURL(/\/$/);
    await expect(page.getByRole("button", { name: "Buscar hotéis" })).toBeVisible();
    // A rota escondida continua anexada, mas sem conteúdo: o wipe roda no cleanup, depois de esconder.
    for (const secret of secrets) await expect.poll(html).not.toContain(secret);
    await expect(page.getByText("Sua reserva está confirmada.")).toHaveCount(0);

    await page.goBack();
    await expect(page).toHaveURL(bookingPath(id));
    await expect(page.getByRole("heading", { level: 1, name: "Reserva confirmada" })).toBeVisible();
    await expect(page.getByText("Ana Souza")).toBeVisible();
  });
});

test.describe("listas e painéis transitórios voltam fechados (critério 25) @prod", () => {
  test("as sugestões do combobox", async ({ page }) => {
    await page.goto("/");
    const destination = page.getByRole("combobox", { name: /Destino/ });
    await destination.focus();
    await destination.pressSequentially("sao", { delay: 30 });
    await expect(page.getByRole("option", { name: /São Paulo, SP/ })).toBeVisible();
    await expect(destination).toHaveAttribute("aria-expanded", "true");

    await page
      .getByRole("link", { name: "Favoritos" })
      .first()
      .evaluate((link) => {
        if (link instanceof HTMLElement) link.click();
      });
    await expect(page).toHaveURL(/\/favorites$/);
    await page.goBack();
    await expect(page).toHaveURL(/\/$/);
    await expect(destination).toHaveAttribute("aria-expanded", "false");
    await expect(page.getByRole("option")).toHaveCount(0);
  });

  test("o drawer de filtros (celular)", async ({ page, isMobile }) => {
    test.skip(!isMobile, "o drawer só existe abaixo de lg");
    await page.goto(searchPath());
    await expect(cards(page)).toHaveCount(10);
    await page.getByRole("button", { name: /^Filtros/ }).click();
    const sheet = page.getByRole("dialog", { name: "Filtros" });
    await expect(sheet).toBeVisible();

    await followLogo(page);
    await expect(page).toHaveURL(/\/$/);
    await page.goBack();
    await expect(page).toHaveURL(/\/search\?/);
    await expect(cards(page).first()).toBeVisible();
    await expect(sheet).toBeHidden();
  });
});

test.describe("/search preserva o estado ao ir e voltar @prod", () => {
  test("filtros e posição de scroll ficam como estavam (critério 24)", async ({
    page,
    isMobile,
  }) => {
    await page.goto(searchPath("amenity=pool"));
    await expect(cards(page)).toHaveCount(ITEMS);
    const hotelLink = cards(page).nth(2).getByRole("link").first();
    await hotelLink.scrollIntoViewIfNeeded();
    const scrollY = await page.evaluate(() => window.scrollY);
    expect(scrollY).toBeGreaterThan(0);
    const url = page.url();

    await hotelLink.click();
    await expect(page).toHaveURL(/\/hotel\/\d+/);
    await page.goBack();

    await expect(page).toHaveURL(url);
    await expect(cards(page)).toHaveCount(ITEMS);
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(scrollY);
    // Desktop: a barra lateral marca "Piscina". Celular: o gatilho do drawer conta 1 filtro.
    if (isMobile) {
      await expect(page.getByRole("button", { name: /^Filtros/ })).toHaveText("Filtros (1)");
    } else {
      await expect(page.getByRole("checkbox", { name: "Piscina" })).toBeChecked();
    }
  });
});
