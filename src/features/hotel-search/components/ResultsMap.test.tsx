import { act, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
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
vi.mock("@/shared/ui/map", () => ({
  useInteractiveMap: () => state.load,
  MapHint: ({ id, text, active }: { id: string; text: string; active?: boolean }) => (
    <p id={id} data-testid="hint">
      {active ? text : null}
    </p>
  ),
}));

/** Mapa de mentira: cada marcador é um botão (o Leaflet real é coberto no E2E e no teste do shared). */
const FakeMap = ({ markers, activeId, onActiveChange, renderPopup }: InteractiveMapProps) => (
  // biome-ignore lint/a11y/noNoninteractiveTabindex: o contêiner do Leaflet real é focável (tabindex 0)
  <div data-testid="fake-map" className="leaflet-container" tabIndex={0}>
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
        {activeId === marker.id
          ? renderPopup?.(marker.id, { close: () => undefined, titleId: `titulo-${marker.id}` })
          : null}
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

/** O `mock` do hook lê `state.load`; o botão só força um novo render do painel. */
const Harness = () => {
  const [, refresh] = useState(0);
  return (
    <>
      <button type="button" onClick={() => refresh((count) => count + 1)}>
        atualizar
      </button>
      <ResultsMap id="painel" hotels={hotels} criteria={criteria} />
    </>
  );
};

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
    await userEvent.click(screen.getByRole("button", { name: "Pular o mapa" }));
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

  it("carregando o chunk: skeleton e 'Carregando mapa…' numa região viva, painel ocupado", () => {
    state.load = { status: "loading" };
    renderMap();
    expect(screen.getByRole("status")).toHaveTextContent("Carregando mapa…");
    expect(document.getElementById("painel")).toHaveAttribute("aria-busy", "true");
  });

  it("falha do chunk: o painel encolhe para o alerta, sem moldura, e o botão pede o chunk de novo", async () => {
    const retry = vi.fn();
    state.load = { status: "error", retry, retrying: false };
    renderMap();
    const alert = screen.getByRole("alert");
    expect(alert).toHaveTextContent("Não foi possível carregar o mapa.");
    expect(alert).toHaveTextContent("A lista abaixo continua disponível.");
    expect(screen.queryByTestId("fake-map")).not.toBeInTheDocument();
    expect(screen.queryByTestId("hint")).not.toBeInTheDocument();
    const button = screen.getByRole("button", { name: "Tentar de novo" });
    expect(button).toHaveClass("w-full", "sm:w-auto");
    await userEvent.click(button);
    expect(retry).toHaveBeenCalledTimes(1);
  });

  it("retry em andamento: o botão mostra 'Tentando…' e não aceita novo clique", () => {
    state.load = { status: "error", retry: vi.fn(), retrying: true };
    renderMap();
    const button = screen.getByRole("button", { name: "Tentando…" });
    expect(button).toHaveAttribute("aria-busy", "true");
  });

  it("retry com sucesso: o foco vai para o contêiner do mapa", async () => {
    state.load = { status: "error", retry: vi.fn(), retrying: true };
    renderWithProviders(<Harness />);
    state.load = { status: "ready", Map: FakeMap };
    await userEvent.click(screen.getByRole("button", { name: "atualizar" }));
    expect(screen.getByTestId("fake-map")).toHaveFocus();
  });

  it("sem falha anterior, o mapa pronto não rouba o foco", () => {
    renderMap();
    expect(screen.getByTestId("fake-map")).not.toHaveFocus();
  });

  it("offline sem o chunk: só o aviso (sem moldura) e a lista abaixo segue disponível", () => {
    state.online = false;
    state.load = { status: "idle" };
    renderMap();
    expect(
      screen.getByText("O mapa precisa de internet. A lista abaixo continua disponível."),
    ).toBeInTheDocument();
    expect(screen.queryByTestId("fake-map")).not.toBeInTheDocument();
  });

  it("'Pular o mapa' é o primeiro filho do painel e só existe com o mapa pronto", () => {
    renderMap();
    expect(document.getElementById("painel")?.firstElementChild).toBe(
      screen.getByRole("button", { name: "Pular o mapa" }),
    );
  });

  it("a dica fica abaixo da moldura, ligada ao mapa pelo mesmo id", () => {
    renderMap();
    const hint = screen.getByTestId("hint");
    expect(hint).toHaveTextContent(
      "Setas movem o mapa; + e − mudam o zoom; Tab percorre os hotéis.",
    );
    const frame = screen.getByTestId("fake-map").parentElement;
    expect(frame?.contains(hint)).toBe(false);
  });

  it("o título do popup recebe o id que nomeia o diálogo", () => {
    renderMap();
    act(() => useMapSync.getState().setActive(1));
    expect(screen.getByRole("heading", { name: "Hotel Um" })).toHaveAttribute("id", "titulo-1");
  });
});
