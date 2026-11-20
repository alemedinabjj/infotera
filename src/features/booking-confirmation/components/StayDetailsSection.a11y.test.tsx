import { render } from "@testing-library/react";
import axe from "axe-core";
import { describe, expect, it, vi } from "vitest";
import { makeBooking, makeHotel, makeRoom } from "@/shared/testing/fixtures";
import type { StayDetails } from "../api/confirmation.server";
import { StayDetailsSection } from "./StayDetailsSection";

vi.mock(
  "next/navigation",
  async () => (await import("@/shared/testing/next-navigation")).navigationMock,
);

const OK: StayDetails = {
  hotel: { status: "ok", data: makeHotel() },
  room: { status: "ok", data: makeRoom() },
};

/** Axe WCAG A/AA no DOM renderizado. `color-contrast` fica para o E2E (jsdom não calcula cores). */
const violationsOf = async (details: StayDetails): Promise<string[]> => {
  const section = await StayDetailsSection({
    booking: makeBooking(),
    details: Promise.resolve(details),
    locale: "pt-BR",
  });
  const { container } = render(
    <main>
      <section aria-labelledby="stay">
        <h2 id="stay">Sua estadia</h2>
        {section}
      </section>
    </main>,
  );
  const results = await axe.run(container, {
    runOnly: ["wcag2a", "wcag2aa"],
    rules: { "color-contrast": { enabled: false } },
  });
  return results.violations.map((violation) => `${violation.id}: ${violation.help}`);
};

describe("StayDetailsSection: acessibilidade (critério 19)", () => {
  it("em erro (hotel e quarto): sem violações", async () => {
    expect(await violationsOf({ hotel: { status: "error" }, room: { status: "error" } })).toEqual(
      [],
    );
  });

  it("só o hotel com erro: sem violações", async () => {
    expect(await violationsOf({ ...OK, hotel: { status: "error" } })).toEqual([]);
  });

  it("com tudo certo: sem violações", async () => {
    expect(await violationsOf(OK)).toEqual([]);
  });
});
