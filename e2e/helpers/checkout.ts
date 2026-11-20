import type { Page, Request } from "@playwright/test";
import { addDays, todayISO } from "../../src/shared/lib/dates";
import { CHECK_IN, CHECK_OUT } from "./hotel-search";

export const CPF = "529.982.247-25";
export const CARD = "4111 1111 1111 1111";

type Criteria = {
  destination: string;
  checkIn: string;
  checkOut: string;
  rooms: number;
  adults: number;
  children: number;
};

export type Selection = { hotelId: number; roomId: number; criteria: Criteria };

export const criteria = (overrides: Partial<Criteria> = {}): Criteria => ({
  destination: "Rio de Janeiro, RJ",
  checkIn: CHECK_IN,
  checkOut: CHECK_OUT,
  rooms: 1,
  adults: 2,
  children: 0,
  ...overrides,
});

/** Semeia `infotera:booking-draft` **uma vez** por aba (não re-semeia depois de a reserva limpar). */
export const seedSelection = async (page: Page, selection: Selection): Promise<void> => {
  await page.addInitScript((value) => {
    if (sessionStorage.getItem("e2e:seeded")) return;
    sessionStorage.setItem("e2e:seeded", "1");
    sessionStorage.setItem(
      "infotera:booking-draft",
      JSON.stringify({ state: { selection: value }, version: 1 }),
    );
  }, selection);
};

/** Validade `MM/AA` daqui a 2 anos (sempre futura). */
export const futureExpiry = (): string => {
  const date = addDays(todayISO(), 730);
  return `${date.slice(5, 7)}/${date.slice(2, 4)}`;
};

export const fillPersonal = async (
  page: Page,
  { companions = [] as { first: string; last: string; age?: string }[] } = {},
): Promise<void> => {
  const holder = page.getByRole("group", { name: "Hóspede 1 · titular da reserva" });
  await holder.getByLabel("Nome", { exact: true }).fill("Ana");
  await holder.getByLabel("Sobrenome").fill("Souza");
  await holder.getByLabel("E-mail").fill("ana@exemplo.com");
  await page.getByLabel("Número de telefone").fill("11987654321");
  for (const [index, companion] of companions.entries()) {
    const block = page.getByRole("group", { name: new RegExp(`^Hóspede ${index + 2} ·`) });
    await block.getByLabel("Nome", { exact: true }).fill(companion.first);
    await block.getByLabel("Sobrenome").fill(companion.last);
    if (companion.age) await block.getByLabel("Idade no check-in").selectOption(companion.age);
  }
};

export const fillPayment = async (page: Page): Promise<void> => {
  await page.getByLabel("Número do cartão").fill(CARD);
  await page.getByLabel("Nome impresso no cartão").fill("ANA SOUZA");
  await page.getByLabel("Validade").fill(futureExpiry().replace("/", ""));
  await page.getByLabel("CVV").fill("123");
  await page.getByRole("textbox", { name: "CPF" }).fill(CPF.replace(/\D/g, ""));
};

export const clickPrimary = (page: Page, name: string) =>
  page.getByRole("button", { name, exact: true }).click();

/** Passa pelos passos 1 e 2 até a revisão. */
export const goToReview = async (
  page: Page,
  options: Parameters<typeof fillPersonal>[1] = {},
): Promise<void> => {
  await fillPersonal(page, options);
  await clickPrimary(page, "Continuar para pagamento");
  await page.getByRole("heading", { level: 2, name: "Pagamento" }).waitFor();
  await fillPayment(page);
  await clickPrimary(page, "Revisar reserva");
  await page.getByRole("heading", { level: 2, name: "Revise e confirme" }).waitFor();
};

/** Abre o painel do resumo (abaixo de `lg`) e o campo do cupom, se estiverem recolhidos. */
export const openCouponField = async (page: Page): Promise<void> => {
  const details = page.getByRole("button", { name: "Ver detalhes da reserva" });
  if ((await details.isVisible()) && (await details.getAttribute("aria-expanded")) === "false") {
    await details.click();
  }
  const toggle = page.getByRole("button", { name: "Tenho um cupom de desconto" });
  if ((await toggle.getAttribute("aria-expanded")) === "false") await toggle.click();
};

export const applyCoupon = async (page: Page, code: string): Promise<void> => {
  await openCouponField(page);
  await page.getByLabel("Cupom de desconto").fill(code);
  await page.getByRole("button", { name: "Aplicar cupom" }).click();
};

export const acceptTermsViaDialog = async (page: Page): Promise<void> => {
  await page.getByRole("button", { name: "Ler termos e condições" }).click();
  await page.getByRole("button", { name: "Li e aceito" }).click();
};

/** Instala o coletor de violações de CSP (antes de qualquer navegação). */
export const collectCspViolations = async (page: Page): Promise<() => Promise<string[]>> => {
  await page.addInitScript(() => {
    const store: string[] = [];
    Object.defineProperty(window, "__cspViolations", { value: store });
    document.addEventListener("securitypolicyviolation", (event) => {
      store.push(`${event.violatedDirective} ${event.blockedURI}`);
    });
  });
  return () =>
    page.evaluate(() => {
      const found: unknown = Reflect.get(window, "__cspViolations");
      return Array.isArray(found) ? found.map(String) : [];
    });
};

const isActionRequest = (request: Request): boolean =>
  request.method() === "POST" && request.headers()["next-action"] !== undefined;

/** Requisições da Server Action (POST com o header `next-action`). */
export const actionRequests = (page: Page): Request[] => {
  const found: Request[] = [];
  page.on("request", (request) => {
    if (isActionRequest(request)) found.push(request);
  });
  return found;
};

export const stored = (page: Page, key: string): Promise<string | null> =>
  page.evaluate((name) => sessionStorage.getItem(name), key);
