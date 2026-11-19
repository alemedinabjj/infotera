import { afterEach, describe, expect, it, vi } from "vitest";
import { revealBelowHeader } from "./scroll";

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
