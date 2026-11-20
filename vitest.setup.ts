import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

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
