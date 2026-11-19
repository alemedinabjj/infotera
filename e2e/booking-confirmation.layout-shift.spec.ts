import { expect, test } from "@playwright/test";
import { bookingPath, createBooking } from "./helpers/booking";
import { API_URL } from "./helpers/hotel-search";

// O skeleton de "Sua estadia" tem a geometria do conteúdo final: o h2 "Hóspedes" (logo abaixo) não
// pode se mover quando hotel e quarto chegam. O servidor do Next busca hotel e quarto, então o
// `page.route` não os vê: a janela do skeleton é o atraso da mock-api (300 ms por request, padrão
// de `npm run server`; hotel e quarto só começam depois da reserva). Um gravador no navegador
// anota, a cada quadro, a distância entre o h2 "Sua estadia" e o h2 "Hóspedes".

const TOLERANCE_PX = 4;
const MIN_API_DELAY_MS = 150;

type Frame = { phase: "skeleton" | "final"; offset: number };

const VIEWPORTS = [
  { name: "320", width: 320, height: 720 },
  { name: "375", width: 375, height: 720 },
  { name: "768", width: 768, height: 800 },
  { name: "1280", width: 1280, height: 800 },
] as const;

const recorder = () => {
  const frames: Frame[] = [];
  Reflect.set(window, "__stayFrames", frames);
  const heading = (text: string) =>
    [...document.querySelectorAll("h2")].find((node) => node.textContent?.trim() === text);
  const tick = () => {
    const stay = heading("Sua estadia");
    const guests = heading("Hóspedes");
    const region = stay?.closest("section");
    const staySize = stay?.getBoundingClientRect();
    const guestsSize = guests?.getBoundingClientRect();
    // Segmentos ainda em `<div hidden>` (antes da troca do Suspense) não têm caixa: ignorados.
    if (stay && guests && region && staySize?.height && guestsSize?.height) {
      const offset = guestsSize.top - staySize.top;
      if (region.querySelector('[aria-busy="true"]')) frames.push({ phase: "skeleton", offset });
      else if (region.querySelector("h3")) frames.push({ phase: "final", offset });
    }
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
};

const readFrames = (frames: unknown): Frame[] =>
  Array.isArray(frames) ? frames.filter(isFrame) : [];

const isFrame = (value: unknown): value is Frame =>
  typeof value === "object" &&
  value !== null &&
  "phase" in value &&
  "offset" in value &&
  typeof value.offset === "number" &&
  (value.phase === "skeleton" || value.phase === "final");

test.describe("sem salto de layout quando hotel e quarto chegam (critério 6)", () => {
  // A janela do skeleton é curta (um atraso da API): em raras execuções o navegador junta o quadro
  // do skeleton com o do conteúdo e nada é medido. Repetir é seguro: a asserção de geometria é exata.
  test.describe.configure({ retries: 2 });

  test.beforeEach(async ({ request }, testInfo) => {
    testInfo.skip(testInfo.project.name !== "desktop-chromium", "viewports definidos no teste");
    const started = Date.now();
    await request.get(`${API_URL}/hotels/1`);
    testInfo.skip(
      Date.now() - started < MIN_API_DELAY_MS,
      "precisa da mock-api com atraso (npm run server, 300 ms): sem ele o skeleton não aparece",
    );
  });

  for (const { name, width, height } of VIEWPORTS) {
    test(`h2 Hóspedes fica no lugar em ${name}px`, async ({ page, request }) => {
      await page.setViewportSize({ width, height });
      await page.addInitScript(recorder);
      const id = await createBooking(request);
      await page.goto(bookingPath(id));
      await expect(page.getByRole("heading", { level: 3, name: /Copacabana/ })).toBeVisible();
      await expect(page.getByRole("heading", { level: 2, name: "Hóspedes" })).toBeVisible();
      const frames = readFrames(await page.evaluate(() => Reflect.get(window, "__stayFrames")));
      const skeleton = frames.filter((frame) => frame.phase === "skeleton");
      const final = frames.filter((frame) => frame.phase === "final");
      expect(skeleton.length, "o skeleton precisa ter sido medido").toBeGreaterThan(0);
      expect(final.length).toBeGreaterThan(0);
      const before = skeleton[skeleton.length - 1]?.offset ?? Number.NaN;
      const after = final[final.length - 1]?.offset ?? Number.NaN;
      expect(
        Math.abs(after - before),
        `skeleton ${before}px, final ${after}px`,
      ).toBeLessThanOrEqual(TOLERANCE_PX);
    });
  }
});
