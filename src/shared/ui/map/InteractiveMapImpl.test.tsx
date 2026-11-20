import { act, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { InteractiveMapImpl, type InteractiveMapProps } from "./InteractiveMapImpl";
import type { MapLabels, MapMarker } from "./types";

const labels: MapLabels = {
  region: "Mapa dos resultados",
  hint: "Setas movem o mapa; + e − mudam o zoom.",
  zoomIn: "Ampliar o mapa",
  zoomOut: "Reduzir o mapa",
  closePopup: "Fechar",
  attribution: "© colaboradores do OpenStreetMap",
};

const marker = (id: string, overrides: Partial<MapMarker> = {}): MapMarker => ({
  id,
  position: { lat: -22.9 + Number(id) / 100, lng: -43.2 },
  variant: "pill",
  text: `R$ ${id}00`,
  label: `Hotel ${id}, R$ ${id}00 por noite`,
  tone: "default",
  ...overrides,
});

const renderMap = (props: Partial<InteractiveMapProps> = {}) =>
  render(
    <InteractiveMapImpl
      markers={[marker("1"), marker("2")]}
      labels={labels}
      className="h-80 w-96"
      {...props}
    />,
  );

/** Enter como o navegador manda: `keydown` e depois `keypress` (o Leaflet abre o popup no segundo). */
const pressEnter = (element: HTMLElement) => {
  fireEvent.keyDown(element, { key: "Enter", keyCode: 13 });
  fireEvent.keyPress(element, { key: "Enter", keyCode: 13, charCode: 13 });
};

const markerButton = (name: RegExp) => screen.getByRole("button", { name });

describe("InteractiveMapImpl (Leaflet real no jsdom)", () => {
  it("o contêiner é uma região nomeada, descrita pela dica de teclado", () => {
    renderMap();
    const region = screen.getByRole("region", { name: "Mapa dos resultados" });
    expect(region).toHaveAttribute("tabindex", "0");
    const hint = document.getElementById(region.getAttribute("aria-describedby") ?? "");
    expect(hint).toHaveTextContent("Setas movem o mapa");
  });

  it("zoom com nome acessível traduzido e atribuição sempre presente", () => {
    renderMap();
    expect(screen.getByRole("button", { name: "Ampliar o mapa" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Reduzir o mapa" })).toBeInTheDocument();
    const link = screen.getByRole("link", { name: "© colaboradores do OpenStreetMap" });
    expect(link).toHaveAttribute("href", "https://www.openstreetmap.org/copyright");
  });

  it("um marcador focável por item, na ordem recebida, com nome e estado", () => {
    renderMap({ activeId: "2" });
    const first = markerButton(/Hotel 1,/);
    const second = markerButton(/Hotel 2,/);
    expect(first).toHaveAttribute("tabindex", "0");
    expect(first).toHaveAttribute("data-active", "false");
    expect(second).toHaveAttribute("data-active", "true");
    expect(first.compareDocumentPosition(second) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it("nome do hotel com HTML aparece como texto literal", () => {
    renderMap({ markers: [marker("1", { text: "<img src=x onerror=alert(1)>" })] });
    expect(document.querySelector(".leaflet-marker-icon img")).toBeNull();
    expect(screen.getByText("<img src=x onerror=alert(1)>")).toBeInTheDocument();
  });

  it("foco e hover no marcador avisam o destaque", async () => {
    const onActiveChange = vi.fn();
    renderMap({ onActiveChange });
    act(() => markerButton(/Hotel 1,/).focus());
    expect(onActiveChange).toHaveBeenLastCalledWith("1");
    act(() => markerButton(/Hotel 1,/).blur());
    expect(onActiveChange).toHaveBeenLastCalledWith(null);
  });

  it("Enter abre o popup com o foco dentro; Esc fecha e o foco volta ao marcador", async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    renderMap({
      onSelect,
      renderPopup: (id) => <a href={`/hotel/${id}`}>Ver hotel {id}</a>,
    });
    const first = markerButton(/Hotel 1,/);
    act(() => first.focus());
    pressEnter(first);
    expect(onSelect).toHaveBeenCalledWith("1");
    const link = await screen.findByRole("link", { name: "Ver hotel 1" });
    expect(link).toHaveFocus();
    expect(screen.getByRole("button", { name: "Fechar" })).toBeInTheDocument();
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("link", { name: "Ver hotel 1" })).not.toBeInTheDocument();
    expect(markerButton(/Hotel 1,/)).toHaveFocus();
  });

  it("sem renderPopup o marcador não abre popup", async () => {
    renderMap();
    act(() => markerButton(/Hotel 1,/).focus());
    pressEnter(markerButton(/Hotel 1,/));
    expect(document.querySelector(".leaflet-popup")).toBeNull();
  });

  it("com `center` o mapa é fixo e não enquadra os marcadores", () => {
    renderMap({
      center: { lat: -22.9, lng: -43.2 },
      zoom: 15,
      markers: [marker("1", { variant: "pin", text: "", label: "Hotel Copacabana" })],
    });
    expect(markerButton(/Hotel Copacabana/)).toBeInTheDocument();
  });
});
