import { act } from "@testing-library/react";
import { vi } from "vitest";

type Callback = (entries: IntersectionObserverEntry[]) => void;

const toEntry = (target: Element, isIntersecting: boolean): IntersectionObserverEntry => {
  const rect = target.getBoundingClientRect();
  return {
    target,
    isIntersecting,
    intersectionRatio: isIntersecting ? 1 : 0,
    boundingClientRect: rect,
    intersectionRect: rect,
    rootBounds: null,
    time: 0,
  };
};

/** `IntersectionObserver` falso (o jsdom não tem): `trigger` simula o rodapé entrando na janela. */
export class FakeIntersectionObserver {
  static instances: FakeIntersectionObserver[] = [];
  readonly targets = new Set<Element>();
  disconnected = false;

  constructor(
    private readonly callback: Callback,
    readonly options?: IntersectionObserverInit,
  ) {
    FakeIntersectionObserver.instances.push(this);
  }

  observe(target: Element) {
    this.targets.add(target);
  }

  unobserve(target: Element) {
    this.targets.delete(target);
  }

  disconnect() {
    this.disconnected = true;
    this.targets.clear();
  }

  takeRecords(): IntersectionObserverEntry[] {
    return [];
  }

  fire(isIntersecting: boolean) {
    this.callback([...this.targets].map((target) => toEntry(target, isIntersecting)));
  }
}

export const installFakeIntersectionObserver = () => {
  FakeIntersectionObserver.instances = [];
  vi.stubGlobal("IntersectionObserver", FakeIntersectionObserver);
};

/** Observadores ainda ativos (com alvo). */
export const liveObservers = (): FakeIntersectionObserver[] =>
  FakeIntersectionObserver.instances.filter((item) => !item.disconnected && item.targets.size > 0);

/** O rodapé entra (ou sai) da janela para todos os observadores ativos. */
export const triggerIntersection = (isIntersecting = true) => {
  act(() => {
    for (const observer of liveObservers()) observer.fire(isIntersecting);
  });
};
