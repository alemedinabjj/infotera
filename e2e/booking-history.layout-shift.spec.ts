import { expect } from "@playwright/test";
import { createBooking } from "./helpers/booking";
import { hotelName } from "./helpers/hotel-search";
import { test } from "./helpers/server-api";

// O card de /my-bookings não pode crescer quando a reserva chega (o skeleton espelha o card).
// O proxy de controle segura `GET /bookings/:id`; mede o skeleton, solta e mede o card pronto.

const HISTORY_KEY = "infotera:booking-history";
const TOLERANCE_PX = 2;

for (const width of [320, 390]) {
  test(`skeleton e card final têm a mesma altura em ${width}px`, async ({
    page,
    request,
    serverApi,
  }) => {
    const id = await createBooking(request);
    const name = await hotelName(request, 1);
    await page.setViewportSize({ width, height: 800 });
    await page.addInitScript(
      ({ key, bookingId }) => {
        window.localStorage.setItem(
          key,
          JSON.stringify([{ id: bookingId, savedAt: new Date().toISOString() }]),
        );
      },
      { key: HISTORY_KEY, bookingId: id },
    );
    const rule = await serverApi.holdServerRequests(new RegExp(`^/bookings/${id}$`));
    await page.goto("/my-bookings");
    await rule.waitForHit();
    const item = page.getByRole("main").locator("ul > li").first();
    await expect(item.locator('[aria-busy="true"]')).toBeVisible();
    const before = (await item.boundingBox())?.height ?? 0;

    await rule.release();
    await expect(page.getByRole("heading", { level: 2, name })).toBeVisible();
    await expect(item.locator('[aria-busy="true"]')).toHaveCount(0);
    const after = (await item.boundingBox())?.height ?? 0;
    expect(Math.abs(after - before)).toBeLessThanOrEqual(TOLERANCE_PX);
  });
}
