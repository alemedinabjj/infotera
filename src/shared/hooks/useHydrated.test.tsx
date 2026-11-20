import { render, renderHook, screen } from "@testing-library/react";
import { hydrateRoot } from "react-dom/client";
import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { useHydrated } from "./useHydrated";

const Probe = () => <p>{useHydrated() ? "hidratado" : "servidor"}</p>;

describe("useHydrated", () => {
  it("no cliente (render normal) é true", () => {
    const { result } = renderHook(() => useHydrated());
    expect(result.current).toBe(true);
    render(<Probe />);
    expect(screen.getByText("hidratado")).toBeInTheDocument();
  });

  it("no servidor é false", () => {
    expect(renderToString(<Probe />)).toContain("servidor");
  });

  it("na hidratação o primeiro render bate com o servidor e depois passa a true", async () => {
    const container = document.createElement("div");
    container.innerHTML = renderToString(<Probe />);
    document.body.append(container);
    const errors: unknown[] = [];
    const { act } = await import("react");
    await act(async () => {
      hydrateRoot(container, <Probe />, { onRecoverableError: (error) => errors.push(error) });
    });
    expect(errors).toEqual([]);
    expect(container.textContent).toBe("hidratado");
    container.remove();
  });
});
