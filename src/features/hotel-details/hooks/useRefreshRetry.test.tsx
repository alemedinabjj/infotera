import { act, render, renderHook } from "@testing-library/react";
import { Activity } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { navigationSpies } from "@/shared/testing/next-navigation";
import { useRefreshRetry } from "./useRefreshRetry";

vi.mock(
  "next/navigation",
  async () => (await import("@/shared/testing/next-navigation")).navigationMock,
);

const mountHeading = () => {
  const heading = document.createElement("h2");
  heading.id = "quartos-titulo";
  heading.tabIndex = -1;
  document.body.append(heading);
  return heading;
};

const RetrySection = () => {
  const { retry, anchorRef } = useRefreshRetry("quartos-titulo");
  return (
    <section>
      <h2 id="quartos-titulo" tabIndex={-1}>
        Quartos
      </h2>
      <div ref={anchorRef}>
        <button type="button" onClick={retry}>
          Tentar de novo
        </button>
      </div>
    </section>
  );
};

afterEach(() => {
  document.body.replaceChildren();
  navigationSpies.refresh.mockClear();
});

describe("useRefreshRetry", () => {
  it("retry refaz a página no servidor", () => {
    const { result } = renderHook(() => useRefreshRetry("quartos-titulo"));
    act(() => result.current.retry());
    expect(navigationSpies.refresh).toHaveBeenCalledTimes(1);
  });

  it("ao desmontar depois de um retry (o conteúdo chegou), o foco vai ao h2", () => {
    const heading = mountHeading();
    const { result, unmount } = renderHook(() => useRefreshRetry("quartos-titulo"));
    act(() => result.current.retry());
    unmount();
    expect(heading).toHaveFocus();
  });

  it("desmontar sem retry não mexe no foco", () => {
    const heading = mountHeading();
    const { unmount } = renderHook(() => useRefreshRetry("quartos-titulo"));
    unmount();
    expect(heading).not.toHaveFocus();
  });

  it("esconder a rota (Activity) depois de um retry não move o foco para o h2 de outro hotel", () => {
    // O jsdom não tem `checkVisibility`: simula a regra do `display: none` que o Activity aplica.
    const original = Object.getOwnPropertyDescriptor(HTMLElement.prototype, "checkVisibility");
    Object.defineProperty(HTMLElement.prototype, "checkVisibility", {
      configurable: true,
      value(this: HTMLElement) {
        return this.closest('[style*="display: none"]') === null;
      },
    });
    try {
      const otherHotel = mountHeading();
      const { getByRole, rerender } = render(
        <Activity mode="visible">
          <RetrySection />
        </Activity>,
      );
      act(() => getByRole("button", { name: "Tentar de novo" }).click());
      rerender(
        <Activity mode="hidden">
          <RetrySection />
        </Activity>,
      );
      expect(otherHotel).not.toHaveFocus();
      expect(document.activeElement).toBe(document.body);
    } finally {
      if (original) Object.defineProperty(HTMLElement.prototype, "checkVisibility", original);
      else Reflect.deleteProperty(HTMLElement.prototype, "checkVisibility");
    }
  });
});
