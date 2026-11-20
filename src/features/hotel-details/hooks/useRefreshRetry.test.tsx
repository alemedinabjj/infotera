import { act, renderHook } from "@testing-library/react";
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
});
