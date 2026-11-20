import { describe, expect, it } from "vitest";
import { nextMarkerElement, popupKeyAction } from "./popup-keys";

const press = (key: string, extra: Partial<Parameters<typeof popupKeyAction>[0]> = {}) =>
  popupKeyAction({ key, shiftKey: false, atFirst: false, atLast: false, ...extra });

describe("popupKeyAction", () => {
  it("Esc sempre fecha e volta ao marcador", () => {
    expect(press("Escape")).toBe("close-to-marker");
  });

  it("Tab no último controle fecha e vai ao próximo marcador", () => {
    expect(press("Tab", { atLast: true })).toBe("close-to-next");
  });

  it("Tab fora do último controle anda normalmente", () => {
    expect(press("Tab", { atFirst: true })).toBeNull();
  });

  it("Shift+Tab no primeiro controle volta ao marcador", () => {
    expect(press("Tab", { shiftKey: true, atFirst: true })).toBe("close-to-marker");
  });

  it("Shift+Tab fora do primeiro controle anda normalmente", () => {
    expect(press("Tab", { shiftKey: true, atLast: true })).toBeNull();
  });

  it("popup de um controle só: Tab vai ao próximo marcador, Shift+Tab ao próprio", () => {
    expect(press("Tab", { atFirst: true, atLast: true })).toBe("close-to-next");
    expect(press("Tab", { shiftKey: true, atFirst: true, atLast: true })).toBe("close-to-marker");
  });

  it("outras teclas passam", () => {
    expect(press("a", { atFirst: true, atLast: true })).toBeNull();
    expect(press("Enter", { atLast: true })).toBeNull();
  });
});

describe("nextMarkerElement", () => {
  const marker = () => {
    const element = document.createElement("div");
    element.className = "leaflet-marker-icon";
    return element;
  };

  it("devolve o marcador irmão seguinte", () => {
    const pane = document.createElement("div");
    const first = marker();
    const second = marker();
    pane.append(first, second);
    expect(nextMarkerElement(first)).toBe(second);
  });

  it("no último marcador devolve o próprio", () => {
    const pane = document.createElement("div");
    const only = marker();
    pane.append(only);
    expect(nextMarkerElement(only)).toBe(only);
  });

  it("sem elemento, devolve undefined", () => {
    expect(nextMarkerElement(undefined)).toBeUndefined();
  });
});
