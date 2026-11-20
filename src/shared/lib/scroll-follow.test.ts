import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { keepBlockRevealed, SETTLE_MS } from "./scroll-follow";

type Callback = () => void;

const observers: { callback: Callback; observed: Element[]; disconnected: boolean }[] = [];

class FakeResizeObserver {
  private readonly record: { callback: Callback; observed: Element[]; disconnected: boolean };
  constructor(callback: Callback) {
    this.record = { callback, observed: [], disconnected: false };
    observers.push(this.record);
  }
  observe(target: Element) {
    this.record.observed.push(target);
  }
  disconnect() {
    this.record.disconnected = true;
  }
  unobserve() {}
}

const scrollBy = vi.fn();
let top = 400;

const block = () => {
  const element = document.createElement("div");
  element.getBoundingClientRect = () => new DOMRect(0, top, 100, 50);
  document.body.append(element);
  return element;
};

beforeEach(() => {
  vi.useFakeTimers();
  vi.stubGlobal("ResizeObserver", FakeResizeObserver);
  vi.stubGlobal("scrollBy", scrollBy);
  Object.defineProperty(window, "innerHeight", { value: 600, configurable: true });
  document.documentElement.style.scrollPaddingTop = "72px";
  top = 400;
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  observers.length = 0;
  scrollBy.mockReset();
  document.body.innerHTML = "";
  document.documentElement.style.scrollPaddingTop = "";
});

describe("keepBlockRevealed", () => {
  it("revela de novo quando o layout muda e o bloco foi empurrado para fora da área útil", () => {
    const element = block();
    keepBlockRevealed(element);
    observers[0]?.callback();
    expect(scrollBy).not.toHaveBeenCalled();
    top = 580; // um dado chegou acima e empurrou o bloco: termina em 630 > 600
    observers[0]?.callback();
    expect(scrollBy).toHaveBeenCalledWith({ top: 30, behavior: "instant" });
  });

  it("observa o body e as barras fixas", () => {
    const bar = document.createElement("div");
    bar.setAttribute("data-action-bar", "");
    document.body.append(bar);
    keepBlockRevealed(block());
    expect(observers[0]?.observed).toContain(document.body);
    expect(observers[0]?.observed).toContain(bar);
  });

  it("para depois do prazo", () => {
    keepBlockRevealed(block());
    vi.advanceTimersByTime(SETTLE_MS);
    expect(observers[0]?.disconnected).toBe(true);
  });

  it.each(["wheel", "touchstart", "pointerdown", "keydown"])(
    "para no primeiro gesto da pessoa (%s)",
    (name) => {
      keepBlockRevealed(block());
      window.dispatchEvent(new Event(name));
      expect(observers[0]?.disconnected).toBe(true);
    },
  );

  it("a função devolvida encerra e o bloco desmontado não rola", () => {
    const element = block();
    const stop = keepBlockRevealed(element);
    element.remove();
    top = 580;
    observers[0]?.callback();
    expect(scrollBy).not.toHaveBeenCalled();
    stop();
    expect(observers[0]?.disconnected).toBe(true);
  });

  it("sem elemento ou sem ResizeObserver não faz nada", () => {
    expect(() => keepBlockRevealed(null)()).not.toThrow();
    vi.stubGlobal("ResizeObserver", undefined);
    expect(() => keepBlockRevealed(block())()).not.toThrow();
    expect(observers).toHaveLength(0);
  });
});
