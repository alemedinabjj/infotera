import { act, render, screen } from "@testing-library/react";
import type { ComponentProps } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { I18nProvider } from "@/shared/i18n/client";
import { seedHotel } from "@/shared/testing/seed";
import type { InteractiveMapLoad, InteractiveMapProps } from "@/shared/ui/map";
import { InteractiveLocationMap } from "./InteractiveLocationMap";

const state: { online: boolean; load: InteractiveMapLoad } = vi.hoisted(() => ({
  online: true,
  load: { status: "idle" },
}));
const enabledCalls = vi.hoisted((): boolean[] => []);

vi.mock("@/shared/hooks/useOnline", () => ({ useOnline: () => state.online }));
vi.mock("@/shared/ui/map", () => ({
  useInteractiveMap: (enabled: boolean): InteractiveMapLoad => {
    enabledCalls.push(enabled);
    return enabled ? state.load : { status: "idle" };
  },
}));

let lastProps: InteractiveMapProps | null = null;
const FakeMap = (props: InteractiveMapProps) => {
  lastProps = props;
  return <div data-testid="leaflet" className={props.className} />;
};

type Observed = { observer: FakeObserver; element: Element };
let observed: Observed[] = [];

class FakeObserver implements IntersectionObserver {
  readonly root = null;
  readonly rootMargin = "";
  readonly thresholds = [];
  constructor(readonly callback: IntersectionObserverCallback) {}
  observe(element: Element) {
    observed.push({ observer: this, element });
  }
  disconnect() {}
  unobserve() {}
  takeRecords() {
    return [];
  }
}

const entryFor = (target: Element): IntersectionObserverEntry => ({
  isIntersecting: true,
  target,
  boundingClientRect: target.getBoundingClientRect(),
  intersectionRect: target.getBoundingClientRect(),
  rootBounds: null,
  intersectionRatio: 1,
  time: 0,
});

const hotel = seedHotel(1);

const renderMap = (locale: ComponentProps<typeof I18nProvider>["locale"] = "pt-BR") =>
  render(
    <I18nProvider locale={locale}>
      <InteractiveLocationMap hotel={hotel} zoom={15}>
        <div data-testid="static">mapa estático</div>
      </InteractiveLocationMap>
    </I18nProvider>,
  );

const arriveInViewport = () =>
  act(() => {
    for (const { observer, element } of observed) observer.callback([entryFor(element)], observer);
  });

describe("InteractiveLocationMap", () => {
  beforeEach(() => {
    observed = [];
    enabledCalls.length = 0;
    lastProps = null;
    state.online = true;
    state.load = { status: "ready", Map: FakeMap };
    vi.stubGlobal("IntersectionObserver", FakeObserver);
  });
  afterEach(() => vi.unstubAllGlobals());

  it("longe da viewport só mostra o estático e não pede o Leaflet", () => {
    renderMap();
    expect(screen.getByTestId("static")).toBeInTheDocument();
    expect(screen.queryByTestId("leaflet")).not.toBeInTheDocument();
    expect(enabledCalls.every((enabled) => !enabled)).toBe(true);
  });

  it("observa a moldura com 200 px de antecedência", () => {
    const spy = vi.fn();
    vi.stubGlobal(
      "IntersectionObserver",
      class extends FakeObserver {
        constructor(callback: IntersectionObserverCallback, options?: IntersectionObserverInit) {
          super(callback);
          spy(options);
        }
      },
    );
    renderMap();
    expect(spy).toHaveBeenCalledWith({ rootMargin: "200px" });
  });

  it("perto da viewport e online, monta o mapa escondido e mantém o estático até os tiles", () => {
    renderMap();
    arriveInViewport();
    expect(screen.getByTestId("leaflet")).toHaveClass("invisible");
    expect(screen.getByTestId("static")).toBeInTheDocument();
    expect(lastProps?.center).toEqual({ lat: hotel.latitude, lng: hotel.longitude });
    expect(lastProps?.zoom).toBe(15);
  });

  it("depois do primeiro lote de tiles o mapa aparece e o estático sai", () => {
    renderMap();
    arriveInViewport();
    act(() => lastProps?.onTilesLoad?.());
    expect(screen.getByTestId("leaflet")).not.toHaveClass("invisible");
    expect(screen.queryByTestId("static")).not.toBeInTheDocument();
  });

  it("tiles com erro: o estático fica e o Leaflet é desmontado, sem mensagem", () => {
    renderMap();
    arriveInViewport();
    act(() => lastProps?.onTilesError?.());
    expect(screen.getByTestId("static")).toBeInTheDocument();
    expect(screen.queryByTestId("leaflet")).not.toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("offline: nunca pede o Leaflet", () => {
    state.online = false;
    renderMap();
    arriveInViewport();
    expect(screen.queryByTestId("leaflet")).not.toBeInTheDocument();
    expect(screen.getByTestId("static")).toBeInTheDocument();
  });

  it("chunk com erro ou carregando: o estático continua", () => {
    state.load = { status: "error", retry: vi.fn() };
    renderMap();
    arriveInViewport();
    expect(screen.queryByTestId("leaflet")).not.toBeInTheDocument();
    expect(screen.getByTestId("static")).toBeInTheDocument();
  });

  it("a região do mapa é nomeada pelo endereço e o marcador pelo hotel (pt-BR)", () => {
    renderMap();
    arriveInViewport();
    expect(lastProps?.labels.region).toBe(`Mapa: ${hotel.address}`);
    expect(lastProps?.markers).toEqual([
      {
        id: String(hotel.id),
        position: { lat: hotel.latitude, lng: hotel.longitude },
        variant: "pin",
        text: "",
        label: hotel.name,
        tone: "default",
      },
    ]);
  });

  it("em en-US os rótulos vêm em inglês", () => {
    renderMap("en-US");
    arriveInViewport();
    expect(lastProps?.labels.region).toBe(`Map: ${hotel.address}`);
    expect(lastProps?.labels.zoomIn).toBe("Zoom in");
    expect(lastProps?.labels.attribution).toBe("© OpenStreetMap contributors");
  });
});
