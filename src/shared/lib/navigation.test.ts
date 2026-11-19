import { describe, expect, it, vi } from "vitest";
import { assignLocation } from "./navigation";

describe("assignLocation", () => {
  it("chama location.assign com o caminho", () => {
    const assign = vi.fn<(url: string) => void>();
    vi.stubGlobal("location", { ...window.location, assign });
    assignLocation("/checkout");
    expect(assign).toHaveBeenCalledWith("/checkout");
    vi.unstubAllGlobals();
  });
});
