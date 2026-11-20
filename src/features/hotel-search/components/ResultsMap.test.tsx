import { act, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { makeHotel, makeSearchCriteria } from "@/shared/testing/fixtures";
import { renderWithProviders } from "@/shared/testing/render";
import type { InteractiveMapLoad, InteractiveMapProps } from "@/shared/ui/map";
import { resetMapSync, useMapSync } from "../store/map-sync";
import { ResultsMap } from "./ResultsMap";

vi.mock(
  "next/navigation",
  async () => (await import("@/shared/testing/next-navigation")).navigationMock,
);

const state: { online: boolean; load: InteractiveMapLoad } = vi.hoisted(() => ({
  online: true,
  load: { status: "loading" },
}));
vi.mock("@/shared/hooks/useOnline", () => ({ useOnline: () => state.online }));
vi.mock("@/shared/ui/map", () => ({ useInteractiveMap: () => state.load }));

/** Mapa de mentira: cada marcador é um botão (o Leaflet real é coberto no E2E e no teste do shared). */
const FakeMap = ({ markers, activeId, onActiveChange, renderPopup }: InteractiveMapProps) => (
  <div data-testid="fake-map">
    {markers.map((marker) => (
      <div key={marker.id}>
        <button
          type="button"
          aria-label={marker.label}
          data-active={activeId === marker.id}
          onMouseEnter={() => onActiveChange?.(marker.id)}
          onMouseLeave={() => onActiveChange?.(null)}
        >
          {marker.text}
        </button>
        {activeId === marker.id ? renderPopup?.(marker.id, () => undefined) : null}
      </div>
    ))}
  </div>
);

const hotels = [
  makeHotel({ id: 1, name: "Hotel Um", pricePerNight: 500 }),
  makeHotel({ id: 2, name: "Hotel Dois", pricePerNight: 800, availableRooms: 0 }),
];
const criteria = makeSearchCriteria();

const renderMap = () =>
  renderWithProviders(<ResultsMap id="painel" hotels={hotels} criteria={criteria} />);

describe("ResultsMap", () => {
  beforeEach(() => {
    resetMapSync();
    state.online = true;
    state.load = { status: "ready", Map: FakeMap };
  });

  it("um marcador por hotel exibido, com o esgotado diferenciado", () => {
    renderMap();
    expect(screen.getAllByRole("button", { name: /Hotel (Um|Dois)/ })).toHaveLength(2);
    expect(screen.getByRole("button", { name: "Hotel Dois, esgotado" })).toHaveTextContent(
      "Esgotado",
    );
    expect(document.getElementById("painel")).toBeInTheDocument();
  });

  it("'Pular o mapa' leva o foco ao primeiro card pela rotina registrada", async () => {
    const reveal = vi.fn();
    useMapSync.getState().registerReveal(reveal);
    renderMap();
    await userEvent.click(screen.getByRole("link", { name: "Pular o mapa" }));
    expect(reveal).toHaveBeenCalledWith(1);
  });

  it("passar o mouse no marcador destaca o hotel no store (e o card)", async () => {
    renderMap();
    await userEvent.hover(screen.getByRole("button", { name: /Hotel Um/ }));
    expect(useMapSync.getState().activeHotelId).toBe(1);
    expect(screen.getByRole("button", { name: /Hotel Um/ })).toHaveAttribute("data-active", "true");
    await userEvent.unhover(screen.getByRole("button", { name: /Hotel Um/ }));
    expect(useMapSync.getState().activeHotelId).toBeNull();
  });

  it("o destaque vindo de um card acende o marcador", () => {
    renderMap();
    act(() => useMapSync.getState().setActive(2));
    expect(screen.getByRole("button", { name: /Hotel Dois/ })).toHaveAttribute(
      "data-active",
      "true",
    );
  });

  it("popup: nome, nota, preço, 'Ver hotel' com os critérios e 'Mostrar na lista'", async () => {
    const reveal = vi.fn();
    useMapSync.getState().registerReveal(reveal);
    renderMap();
    act(() => useMapSync.getState().setActive(1));
    const link = screen.getByRole("link", { name: "Ver hotel" });
    expect(link.getAttribute("href")).toMatch(/^\/hotel\/1\?destination=/);
    expect(screen.getByText(/por noite/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Mostrar na lista" }));
    expect(reveal).toHaveBeenCalledWith(1);
  });

  it("carregando o chunk: skeleton e 'Carregando mapa…' numa região viva", () => {
    state.load = { status: "loading" };
    renderMap();
    expect(screen.getByRole("status")).toHaveTextContent("Carregando mapa…");
  });

  it("falha do chunk: alerta com 'Tentar de novo' que pede o chunk de novo", async () => {
    const retry = vi.fn();
    state.load = { status: "error", retry };
    renderMap();
    expect(screen.getByRole("alert")).toHaveTextContent("Não foi possível carregar o mapa.");
    await userEvent.click(screen.getByRole("button", { name: "Tentar de novo" }));
    expect(retry).toHaveBeenCalledTimes(1);
  });

  it("offline sem o chunk: aviso de que o mapa precisa de internet", () => {
    state.online = false;
    state.load = { status: "idle" };
    renderMap();
    expect(
      screen.getByText("O mapa precisa de internet. A lista continua disponível."),
    ).toBeInTheDocument();
  });
});
