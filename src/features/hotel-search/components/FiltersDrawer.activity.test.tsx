import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Activity, useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { makeHotel, makeSearchCriteria } from "@/shared/testing/fixtures";
import { setTestUrl } from "@/shared/testing/next-navigation";
import { renderWithProviders } from "@/shared/testing/render";
import { HotelSearchResults } from "./HotelSearchResults";

vi.mock(
  "next/navigation",
  async () => (await import("@/shared/testing/next-navigation")).navigationMock,
);

const CRITERIA =
  "destination=Rio+de+Janeiro%2C+RJ&checkIn=2026-12-12&checkOut=2026-12-15&rooms=1&adults=2&children=0";

type Mode = "visible" | "hidden";

const Host = () => {
  const [mode, setMode] = useState<Mode>("visible");
  return (
    <>
      <button
        type="button"
        onClick={() => setMode((m) => (m === "visible" ? "hidden" : "visible"))}
      >
        alternar rota
      </button>
      <Activity mode={mode}>
        <HotelSearchResults destination="Rio de Janeiro, RJ" criteria={makeSearchCriteria()} />
      </Activity>
    </>
  );
};

afterEach(() => vi.unstubAllGlobals());

describe("FiltersDrawer dentro de Activity (F7c, critério 25)", () => {
  it("volta fechado depois de a rota ser escondida e mostrada de novo", async () => {
    const user = userEvent.setup();
    const hotels = [makeHotel({ id: 1, name: "Hotel 1" })];
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          new Response(JSON.stringify(hotels), {
            status: 200,
            headers: { "X-Total-Count": "1" },
          }),
      ),
    );
    setTestUrl(`/search?${CRITERIA}`);
    renderWithProviders(<Host />);
    await user.click(await screen.findByRole("button", { name: /^Filtros/ }));
    expect(screen.getByRole("dialog", { name: "Filtros" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "alternar rota" }));
    await user.click(screen.getByRole("button", { name: "alternar rota" }));

    expect(screen.queryByRole("dialog", { name: "Filtros" })).not.toBeInTheDocument();
  });
});
