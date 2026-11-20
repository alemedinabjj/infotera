import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { MotionGlobalConfig } from "motion/react";
import { afterEach, vi } from "vitest";

// Animações instantâneas nos testes: `onExitComplete` dispara logo e nada depende de relógio.
MotionGlobalConfig.skipAnimations = true;

// `server-only` lança fora do bundler do Next; nos testes os módulos de servidor rodam em jsdom.
vi.mock("server-only", () => ({}));

// `cacheLife`/`cacheTag` só existem dentro de um escopo `"use cache"` (compilado pelo Next): nos testes
// as funções do catálogo rodam como funções comuns.
vi.mock("next/cache", () => ({ cacheLife: vi.fn(), cacheTag: vi.fn() }));

// O chunk do Leaflet nunca carrega de verdade nos testes: sem `IntersectionObserver` o jsdom assume
// "perto da viewport" e qualquer teste que renderiza um mapa disparava o `import()` real; o Leaflet
// montava depois de o teste terminar e seus timers rodavam sobre um ambiente já desmontado (erros
// não tratados, só sob carga). Quem testa o mapa usa `InteractiveMapImpl` direto ou mocka o `./loader`.
vi.mock("@/shared/ui/map/loader", () => ({
  loadInteractiveMap: vi.fn(() => new Promise<never>(() => undefined)),
}));

// jsdom não implementa showModal/close de <dialog>: polyfill mínimo (open + evento close).
if (typeof HTMLDialogElement !== "undefined") {
  HTMLDialogElement.prototype.showModal = function showModal() {
    this.setAttribute("open", "");
  };
  HTMLDialogElement.prototype.show = function show() {
    this.setAttribute("open", "");
  };
  HTMLDialogElement.prototype.close = function close(returnValue?: string) {
    if (!this.hasAttribute("open")) return;
    this.removeAttribute("open");
    if (returnValue !== undefined) this.returnValue = returnValue;
    this.dispatchEvent(new Event("close"));
  };
}

afterEach(() => {
  cleanup();
});
