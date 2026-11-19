import { afterEach, describe, expect, it, vi } from "vitest";
import { revealBelowHeader, revealBlock, revealDelta, revealNearest } from "./scroll";

const makeElement = (top: number) => {
  const element = document.createElement("div");
  element.getBoundingClientRect = () => new DOMRect(0, top, 100, 100);
  element.scrollIntoView = vi.fn();
  return element;
};

afterEach(() => {
  document.documentElement.style.scrollPaddingTop = "";
});

describe("revealBelowHeader", () => {
  it("rola quando o topo está atrás do header (acima do scroll-padding)", () => {
    document.documentElement.style.scrollPaddingTop = "72px";
    const element = makeElement(40);
    revealBelowHeader(element);
    expect(element.scrollIntoView).toHaveBeenCalledWith({ block: "start" });
  });

  it("rola quando o topo está acima da janela", () => {
    document.documentElement.style.scrollPaddingTop = "72px";
    const element = makeElement(-300);
    revealBelowHeader(element);
    expect(element.scrollIntoView).toHaveBeenCalledOnce();
  });

  it("não mexe quando o topo já está abaixo do header", () => {
    document.documentElement.style.scrollPaddingTop = "72px";
    const element = makeElement(120);
    revealBelowHeader(element);
    expect(element.scrollIntoView).not.toHaveBeenCalled();
  });

  it("sem scroll-padding o limite é o topo da janela", () => {
    expect(() => revealBelowHeader(null)).not.toThrow();
    const hidden = makeElement(-1);
    revealBelowHeader(hidden);
    expect(hidden.scrollIntoView).toHaveBeenCalledOnce();
    const visible = makeElement(10);
    revealBelowHeader(visible);
    expect(visible.scrollIntoView).not.toHaveBeenCalled();
  });
});

describe("revealNearest", () => {
  const stubMotion = (reduce: boolean) =>
    vi.stubGlobal(
      "matchMedia",
      vi.fn(() => ({ matches: reduce })),
    );
  afterEach(() => vi.unstubAllGlobals());

  it("fora da janela (abaixo): rola o mínimo, suave", () => {
    stubMotion(false);
    Object.defineProperty(window, "innerHeight", { value: 600, configurable: true });
    const element = makeElement(580);
    revealNearest(element);
    expect(element.scrollIntoView).toHaveBeenCalledWith({ block: "nearest", behavior: "smooth" });
  });

  it("movimento reduzido: behavior auto", () => {
    stubMotion(true);
    Object.defineProperty(window, "innerHeight", { value: 600, configurable: true });
    const element = makeElement(580);
    revealNearest(element);
    expect(element.scrollIntoView).toHaveBeenCalledWith({ block: "nearest", behavior: "auto" });
  });

  it("já inteiro na janela: não rola", () => {
    stubMotion(false);
    Object.defineProperty(window, "innerHeight", { value: 600, configurable: true });
    const element = makeElement(100);
    revealNearest(element);
    expect(element.scrollIntoView).not.toHaveBeenCalled();
    expect(() => revealNearest(null)).not.toThrow();
  });
});

describe("revealDelta", () => {
  it.each([
    [{ top: 100, bottom: 200 }, 0],
    [{ top: 40, bottom: 140 }, -32], // sob o header
    [{ top: 500, bottom: 650 }, 50], // abaixo da área útil
    [{ top: 100, bottom: 900 }, 28], // mais alto que a área útil: alinha pelo topo
  ])("%j → %d", (box, expected) => {
    expect(revealDelta(box, 72, 600)).toBe(expected);
  });
});

describe("revealBlock", () => {
  const scrollBy = vi.fn();
  afterEach(() => {
    vi.unstubAllGlobals();
    document.body.innerHTML = "";
    scrollBy.mockReset();
  });
  const setup = (barTop: number | null) => {
    Object.defineProperty(window, "innerHeight", { value: 800, configurable: true });
    vi.stubGlobal("scrollBy", scrollBy);
    document.documentElement.style.scrollPaddingTop = "72px";
    if (barTop !== null) {
      const bar = document.createElement("div");
      bar.setAttribute("data-action-bar", "");
      bar.style.position = "fixed";
      bar.getBoundingClientRect = () => new DOMRect(0, barTop, 100, 100);
      document.body.append(bar);
    }
  };

  it("rola quando o bloco termina atrás da barra fixa", () => {
    setup(700);
    revealBlock(makeElement(600)); // bottom 700 > 692
    expect(scrollBy).toHaveBeenCalledWith({ top: 8, behavior: "instant" });
  });

  it("sem barra fixa o limite é o fim da janela", () => {
    setup(null);
    revealBlock(makeElement(600));
    expect(scrollBy).not.toHaveBeenCalled();
    revealBlock(makeElement(750));
    expect(scrollBy).toHaveBeenCalledOnce();
  });

  it("a bandeja de comparação (data-bottom-bar) também limita a área útil", () => {
    setup(null);
    const tray = document.createElement("div");
    tray.setAttribute("data-bottom-bar", "");
    tray.style.position = "fixed";
    tray.getBoundingClientRect = () => new DOMRect(0, 700, 100, 100);
    document.body.append(tray);
    revealBlock(makeElement(600));
    expect(scrollBy).toHaveBeenCalledWith({ top: 8, behavior: "instant" });
  });

  it("rola para cima quando o topo está sob o header", () => {
    setup(700);
    revealBlock(makeElement(20));
    expect(scrollBy).toHaveBeenCalledWith({ top: -52, behavior: "instant" });
    expect(() => revealBlock(null)).not.toThrow();
  });
});
