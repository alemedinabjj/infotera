import { expect, type Page, test } from "@playwright/test";
import { analyzeAccessibility } from "./helpers/axe";
import { criteria, futureExpiry, seedSelection } from "./helpers/checkout";
import { noHorizontalScroll } from "./helpers/hotel-details";
import { API_URL } from "./helpers/hotel-search";
import { portugueseLeftovers } from "./helpers/language";

const UUID_PATH =
  /\/en\/confirmation\/[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

/** Nomes próprios vindos da API (hotel, quarto, endereço) e a marca: não são traduzidos. */
const properNames = async (page: Page): Promise<string[]> => {
  const names: string[] = ["Infotera Hotéis", "Português", "Rio de Janeiro, RJ"];
  for (const path of ["/hotels/1", "/rooms/1"]) {
    const data: unknown = await (await page.request.get(`${API_URL}${path}`)).json();
    if (data && typeof data === "object") {
      for (const key of ["name", "address", "city", "description"]) {
        const value = Reflect.get(data, key);
        if (typeof value === "string") names.push(value);
      }
    }
  }
  return names;
};

const openCheckout = async (page: Page) => {
  await seedSelection(page, { hotelId: 1, roomId: 1, criteria: criteria() });
  await page.goto("/en/checkout");
  await expect(page.getByRole("heading", { level: 2, name: "Guest details" })).toBeVisible();
};

const expectEnglish = async (page: Page) => {
  expect(await portugueseLeftovers(page, await properNames(page))).toEqual([]);
};

const expectNoViolations = async (page: Page) => {
  const results = await analyzeAccessibility(page);
  expect(
    results.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target).join(" | ")}`),
  ).toEqual([]);
};

test("CSP com nonce em /checkout e /en/checkout (e só nelas)", async ({ request }) => {
  const nonce = /script-src [^;]*'nonce-[^']+'/;
  for (const path of ["/checkout", "/en/checkout"]) {
    const response = await request.get(path);
    expect(response.headers()["content-security-policy"], path).toMatch(nonce);
  }
  const home = await request.get("/en");
  expect(home.headers()["content-security-policy"] ?? "").not.toMatch(nonce);
});

test.describe("checkout em inglês", () => {
  test("passo 1: texto em inglês, validações em inglês, axe e sem rolagem lateral", async ({
    page,
  }) => {
    await openCheckout(page);
    await expect(page.locator("html")).toHaveAttribute("lang", "en-US");
    await expect(page).toHaveTitle(/^(Complete your booking|Step 1 of 3: Guest details) \| /);
    await expect(
      page.getByRole("heading", { level: 1, name: "Complete your booking" }),
    ).toBeVisible();
    await expect(page.getByText("Demo environment — never enter real information.")).toBeVisible();
    await expect(page.getByRole("link", { name: "Back to hotel" })).toHaveAttribute(
      "href",
      /^\/en\/hotel\/1\?/,
    );
    await expectEnglish(page);
    await expectNoViolations(page);

    await page.getByRole("button", { name: "Continue to payment", exact: true }).click();
    await expect(page.getByRole("alert").filter({ hasText: "Fix" })).toBeVisible();
    for (const message of [
      "Enter the first name.",
      "Enter the last name.",
      "Enter the email.",
      "Enter the phone number.",
    ]) {
      await expect(page.getByText(message).first()).toBeVisible();
    }
    await expectEnglish(page);
    await expectNoViolations(page);
    expect(await noHorizontalScroll(page)).toBe(true);
  });

  test("do passo 1 à reserva criada, tudo em inglês, e a confirmação fica em /en", async ({
    page,
  }) => {
    await openCheckout(page);
    const holder = page.getByRole("group", { name: "Guest 1 · booking holder" });
    await holder.getByLabel("First name").fill("Ana");
    await holder.getByLabel("Last name").fill("Souza");
    await holder.getByLabel("Email", { exact: true }).fill("ana@example.net");
    await page.getByLabel("Phone number").fill("11987654321");
    const guest = page.getByRole("group", { name: /^Guest 2 ·/ });
    await guest.getByLabel("First name").fill("Bruno");
    await guest.getByLabel("Last name").fill("Souza");
    await page.getByRole("button", { name: "Continue to payment", exact: true }).click();

    await expect(page.getByRole("heading", { level: 2, name: "Payment" })).toBeVisible();
    await page.getByLabel("Card number").fill("4111 1111 1111 1111");
    await page.getByLabel("Name printed on the card").fill("ANA SOUZA");
    await page.getByLabel("Expiry date").fill(futureExpiry().replace("/", ""));
    await page.getByLabel("CVV").fill("12");
    await page.getByRole("textbox", { name: "CPF" }).fill("12345678900");
    await page.getByRole("button", { name: "Review booking", exact: true }).click();
    await expect(
      page.getByText("Enter the 3 digits on the back of the card.", { exact: true }),
    ).toBeVisible();
    await expect(
      page.getByText("Invalid CPF. Check the 11 digits.", { exact: true }),
    ).toBeVisible();
    await expectEnglish(page);
    await expectNoViolations(page);

    await page.getByLabel("CVV").fill("123");
    await page.getByRole("textbox", { name: "CPF" }).fill("52998224725");
    await page.getByRole("button", { name: "Review booking", exact: true }).click();
    await expect(page.getByRole("heading", { level: 2, name: "Review and confirm" })).toBeVisible();

    const details = page.getByRole("button", { name: "View booking details" });
    if ((await details.isVisible()) && (await details.getAttribute("aria-expanded")) === "false") {
      await details.click();
    }
    const toggle = page.getByRole("button", { name: "I have a discount coupon" });
    if ((await toggle.getAttribute("aria-expanded")) === "false") await toggle.click();
    await page.getByLabel("Discount coupon").fill("bemvindo10");
    await page.getByRole("button", { name: "Apply coupon" }).click();
    await expect(page.getByText("BEMVINDO10 · 10% off")).toBeVisible();
    await expectEnglish(page);
    await expectNoViolations(page);

    await page.getByRole("button", { name: "Read terms and conditions" }).click();
    await expect(page.getByRole("dialog", { name: "Booking terms and conditions" })).toBeVisible();
    await expectEnglish(page);
    await expectNoViolations(page);
    await page.getByRole("button", { name: "I have read and accept", exact: true }).click();
    await expect(
      page.getByRole("checkbox", { name: /^I have read and accept the booking terms/ }),
    ).toBeChecked();

    await page.getByRole("button", { name: "Confirm booking", exact: true }).click();
    await page.waitForURL(UUID_PATH);
  });
});
