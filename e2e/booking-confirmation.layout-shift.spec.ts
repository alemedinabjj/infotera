import { type APIRequestContext, expect } from "@playwright/test";
import { bookingPath, createControlledBooking } from "./helpers/booking";
import { API_URL } from "./helpers/hotel-search";
import { controlledHotel, hotelRequest, roomRequest, test } from "./helpers/server-api";

// O skeleton de "Sua estadia" tem a geometria do conteúdo final: o h2 "Hóspedes" (logo abaixo) não
// pode se mover quando hotel e quarto chegam. O servidor do Next busca hotel e quarto, então o
// teste os SEGURA no proxy de controle: mede o skeleton enquanto preso, libera e mede o final.
// O hotel e o quarto são exclusivos do worker (não colidem com testes em paralelo), mas o proxy
// responde com o conteúdo do hotel 1 / quarto 1 (Copacabana), no qual o skeleton foi calibrado.
// Um gravador no navegador anota, a cada quadro, a distância entre o h2 "Sua estadia" e o "Hóspedes".

const TOLERANCE_PX = 4;

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

const jsonOf = async (request: APIRequestContext, path: string): Promise<object> => {
  const body: unknown = await (await request.get(`${API_URL}${path}`)).json();
  if (typeof body !== "object" || body === null) throw new Error(`${path} não é um objeto`);
  return body;
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
  test.skip(({ isMobile }) => isMobile, "viewports definidos no teste");

  for (const { name, width, height } of VIEWPORTS) {
    test(`h2 Hóspedes fica no lugar em ${name}px`, async ({
      page,
      request,
      serverApi,
    }, testInfo) => {
      const hotelId = controlledHotel(testInfo.parallelIndex);
      const { id, roomId } = await createControlledBooking(request, hotelId);
      const reference = {
        hotel: await jsonOf(request, "/hotels/1"),
        room: await jsonOf(request, "/rooms/1"),
      };
      const hotel = await serverApi.holdServerRequests(hotelRequest(hotelId), {
        reply: { body: { ...reference.hotel, id: hotelId } },
      });
      const room = await serverApi.holdServerRequests(roomRequest(roomId), {
        reply: { body: { ...reference.room, id: roomId, hotelId } },
      });
      await page.setViewportSize({ width, height });
      await page.addInitScript(recorder);
      await page.goto(bookingPath(id), { waitUntil: "commit" });
      await Promise.all([hotel.waitForHit(), room.waitForHit()]);

      const frames = () =>
        page.evaluate(() => Reflect.get(window, "__stayFrames")).then(readFrames);
      await expect
        .poll(async () => (await frames()).filter((f) => f.phase === "skeleton").length)
        .toBeGreaterThan(0);
      await Promise.all([serverApi.release(hotel), serverApi.release(room)]);
      await expect(page.getByRole("heading", { level: 3, name: /Copacabana/ })).toBeVisible();
      await expect
        .poll(async () => (await frames()).filter((f) => f.phase === "final").length)
        .toBeGreaterThan(0);

      const all = await frames();
      const before = all.filter((f) => f.phase === "skeleton").at(-1)?.offset ?? Number.NaN;
      const after = all.filter((f) => f.phase === "final").at(-1)?.offset ?? Number.NaN;
      expect(
        Math.abs(after - before),
        `skeleton ${before}px, final ${after}px`,
      ).toBeLessThanOrEqual(TOLERANCE_PX);
    });
  }
});
