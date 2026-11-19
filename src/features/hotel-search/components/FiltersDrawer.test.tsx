import { act, fireEvent, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { Hotel } from "@/shared/api/schemas";
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
const ALL: Hotel[] = Array.from({ length: 14 }, (_, index) =>
  makeHotel({ id: index + 1, name: `Hotel ${index + 1}`, availableRooms: 9 }),
);

const json = (items: Hotel[], total: number) =>
  new Response(JSON.stringify(items), { status: 200, headers: { "X-Total-Count": String(total) } });

/** Com comodidade filtrada a API devolve 4 hotéis; sem, a primeira página de 14. */
const stubApi = () =>
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: string) =>
      new URL(input).searchParams.has("amenities_like")
        ? json(ALL.slice(0, 4), 4)
        : json(ALL.slice(0, 10), 14),
    ),
  );

const start = (query = "") => {
  setTestUrl(`/search?${CRITERIA}${query}`);
  return renderWithProviders(
    <HotelSearchResults destination="Rio de Janeiro, RJ" criteria={makeSearchCriteria()} />,
  );
};

const openSheet = async (user: ReturnType<typeof userEvent.setup>) => {
  await user.click(screen.getByRole("button", { name: /^Filtros/ }));
  return screen.getByRole("dialog", { name: "Filtros" });
};

afterEach(() => vi.unstubAllGlobals());

describe("FiltersDrawer (critério 29)", () => {
  it("o gatilho mostra o contador e abre o sheet com o foco no slider Mínimo", async () => {
    const user = userEvent.setup();
    stubApi();
    start("&amenity=pool&type=hotel&minRating=4");
    const trigger = screen.getByRole("button", { name: "Filtros (3)" });
    expect(trigger).toHaveAttribute("aria-haspopup", "dialog");
    const sheet = await openSheet(user);
    expect(within(sheet).getByLabelText("Mínimo")).toHaveFocus();
    expect(within(sheet).getByRole("group", { name: "Comodidades" })).toBeInTheDocument();
    expect(within(sheet).getByRole("button", { name: "Fechar filtros" })).toBeInTheDocument();
  });

  it("filtros aplicam na hora: lista, contador e botão 'Ver N hotéis' acompanham", async () => {
    const user = userEvent.setup();
    stubApi();
    start();
    const sheet = await openSheet(user);
    expect(await within(sheet).findByRole("button", { name: "Ver 14 hotéis" })).toBeInTheDocument();
    await user.click(within(sheet).getByRole("checkbox", { name: "Piscina" }));
    expect(window.location.search).toContain("amenity=pool");
    expect(await within(sheet).findByRole("button", { name: "Ver 4 hotéis" })).toBeInTheDocument();
    expect(screen.getAllByText("Filtros (1)").length).toBeGreaterThan(0);
  });

  it("durante a troca o primário mostra 'Atualizando…' e continua clicável", async () => {
    const user = userEvent.setup();
    stubApi();
    start();
    const sheet = await openSheet(user);
    await within(sheet).findByRole("button", { name: "Ver 14 hotéis" });
    vi.stubGlobal(
      "fetch",
      vi.fn(() => new Promise<Response>(() => undefined)),
    );
    await user.click(within(sheet).getByRole("checkbox", { name: "Spa" }));
    const primary = await within(sheet).findByRole("button", { name: "Atualizando…" });
    await user.click(primary);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("'Ver N hotéis' fecha e devolve o foco ao gatilho", async () => {
    const user = userEvent.setup();
    stubApi();
    start();
    const sheet = await openSheet(user);
    await user.click(await within(sheet).findByRole("button", { name: "Ver 14 hotéis" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Filtros" })).toHaveFocus();
  });

  it("Esc fecha e devolve o foco ao gatilho", async () => {
    const user = userEvent.setup();
    stubApi();
    start();
    await openSheet(user);
    fireEvent(screen.getByRole("dialog"), new Event("cancel", { cancelable: true }));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(screen.getByRole("button", { name: "Filtros" })).toHaveFocus();
  });

  it("'Limpar filtros' do rodapé limpa e mantém o sheet aberto", async () => {
    const user = userEvent.setup();
    stubApi();
    start("&amenity=pool&sort=price-asc");
    const sheet = await openSheet(user);
    await user.click(within(sheet).getByRole("button", { name: "Limpar filtros" }));
    expect(window.location.search).toBe(`?${CRITERIA}&sort=price-asc`);
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("com o sheet aberto só o anunciador do sheet fala (o principal fica mudo)", async () => {
    const user = userEvent.setup();
    stubApi();
    start();
    await screen.findAllByRole("heading", { level: 3 });
    const sheet = await openSheet(user);
    const announcers = document.querySelectorAll("p.sr-only[aria-live='polite']");
    const texts = [...announcers].map((node) => node.textContent);
    expect(texts.filter((text) => text === "14 hotéis encontrados")).toHaveLength(1);
    expect(sheet.querySelector("p.sr-only[aria-live='polite']")).toHaveTextContent(
      "14 hotéis encontrados",
    );
  });

  it("fecha sozinho ao cruzar para lg (matchMedia)", async () => {
    const user = userEvent.setup();
    stubApi();
    let listener: (event: MediaQueryListEvent) => void = () => undefined;
    vi.stubGlobal("matchMedia", () => ({
      addEventListener: (_: string, handler: typeof listener) => {
        listener = handler;
      },
      removeEventListener: () => undefined,
    }));
    start();
    await openSheet(user);
    act(() => listener(Object.assign(new Event("change"), { matches: true, media: "" })));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});
