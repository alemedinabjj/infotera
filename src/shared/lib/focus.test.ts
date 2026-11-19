import { afterEach, describe, expect, it, vi } from "vitest";
import { focusWhenReady } from "./focus";

afterEach(() => {
  vi.useRealTimers();
  document.body.innerHTML = "";
});

describe("focusWhenReady", () => {
  it("foca no primeiro quadro quando o alvo já aceita foco", async () => {
    document.body.innerHTML = "<button>ok</button>";
    const target = document.querySelector("button");
    const done = vi.fn();
    focusWhenReady(() => target, done);
    await vi.waitFor(() => expect(done).toHaveBeenCalledOnce());
    expect(target).toHaveFocus();
  });

  it("insiste enquanto o alvo não pode ser focado e desiste depois de 12 quadros", async () => {
    document.body.innerHTML = "<button disabled>não</button>";
    const target = document.querySelector("button");
    const done = vi.fn();
    const getTarget = vi.fn(() => target);
    focusWhenReady(getTarget, done);
    await vi.waitFor(() => expect(done).toHaveBeenCalledOnce());
    expect(getTarget).toHaveBeenCalledTimes(12);
  });

  it("cancelar impede o foco", async () => {
    document.body.innerHTML = "<button>ok</button>";
    const target = document.querySelector("button");
    const done = vi.fn();
    const cancel = focusWhenReady(() => target, done);
    cancel();
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(done).not.toHaveBeenCalled();
  });
});
