import { describe, expect, it } from "vitest";
import { connectivityView, RESTORED_VISIBLE_MS } from "./connectivity";

describe("connectivityView", () => {
  it.each([
    [true, true, "hidden"],
    [true, false, "offline"],
    [false, false, "offline"],
    [false, true, "restored"],
  ] as const)("antes online=%s, agora online=%s → %s", (prev, now, expected) => {
    expect(connectivityView(prev, now)).toBe(expected);
  });

  it("a confirmação de reconexão dura 4 s", () => {
    expect(RESTORED_VISIBLE_MS).toBe(4000);
  });
});
