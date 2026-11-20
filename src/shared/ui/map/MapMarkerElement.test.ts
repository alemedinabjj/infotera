import { describe, expect, it } from "vitest";
import { createMarkerElement, createMarkerIcon, decorateMarkerElement } from "./MapMarkerElement";
import type { MapMarker } from "./types";

const base: MapMarker = {
  id: "1",
  position: { lat: -22.9, lng: -43.2 },
  variant: "pill",
  text: "R$ 1.200",
  label: "Hotel X, R$ 1.200 por noite",
  tone: "default",
};

describe("createMarkerElement", () => {
  it("mostra o texto como texto literal, nunca como HTML", () => {
    const hostile = '<img src=x onerror="window.__pwned = true">';
    const element = createMarkerElement({ ...base, text: hostile });
    expect(element.textContent).toBe(hostile);
    expect(element.querySelector("img")).toBeNull();
    expect(element.children).toHaveLength(0);
  });

  it("esgotado usa o estilo apagado", () => {
    const element = createMarkerElement({ ...base, text: "Esgotado", tone: "muted" });
    expect(element.textContent).toBe("Esgotado");
    expect(element.className).toContain("bg-surface-sunken");
  });

  it("o pin não tem texto e tem pelo menos 24 px", () => {
    const element = createMarkerElement({ ...base, variant: "pin" });
    expect(element.textContent).toBe("");
    expect(element.className).toContain("size-6");
  });
});

describe("createMarkerIcon", () => {
  it("usa o elemento no invólucro `group` de tamanho zero (o estado ativo é CSS)", () => {
    const icon = createMarkerIcon(base);
    const wrapper = icon.createIcon();
    expect(wrapper.className).toContain("group");
    expect(wrapper.textContent).toBe("R$ 1.200");
    expect(icon.options.iconSize).toEqual([0, 0]);
  });
});

describe("decorateMarkerElement", () => {
  it("aplica nome acessível, id e estado ativo", () => {
    const element = document.createElement("div");
    decorateMarkerElement(element, base, { active: true, expanded: null });
    expect(element).toHaveAttribute("aria-label", base.label);
    expect(element).toHaveAttribute("data-active", "true");
    expect(element).toHaveAttribute("data-marker-id", "1");
    decorateMarkerElement(element, base, { active: false, expanded: null });
    expect(element).toHaveAttribute("data-active", "false");
  });

  it("marcador com popup declara aria-haspopup e o estado em aria-expanded", () => {
    const element = document.createElement("div");
    decorateMarkerElement(element, base, { active: false, expanded: false });
    expect(element).toHaveAttribute("aria-haspopup", "dialog");
    expect(element).toHaveAttribute("aria-expanded", "false");
    decorateMarkerElement(element, base, { active: true, expanded: true });
    expect(element).toHaveAttribute("aria-expanded", "true");
  });

  it("sem popup remove os atributos de popup", () => {
    const element = document.createElement("div");
    decorateMarkerElement(element, base, { active: false, expanded: true });
    decorateMarkerElement(element, base, { active: false, expanded: null });
    expect(element).not.toHaveAttribute("aria-haspopup");
    expect(element).not.toHaveAttribute("aria-expanded");
  });

  it("ignora elemento ausente", () => {
    expect(() =>
      decorateMarkerElement(undefined, base, { active: false, expanded: null }),
    ).not.toThrow();
  });
});
