import { act, render } from "@testing-library/react";
import { Activity } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { navigationSpies } from "@/shared/testing/next-navigation";
import { useCloseOnce } from "./useCloseOnce";

vi.mock(
  "next/navigation",
  async () => (await import("@/shared/testing/next-navigation")).navigationMock,
);

type Api = ReturnType<typeof useCloseOnce>;
let api: Api | null = null;

const Probe = () => {
  api = useCloseOnce();
  return null;
};

const Host = ({ mode }: { mode: "visible" | "hidden" }) => (
  <Activity mode={mode}>
    <Probe />
  </Activity>
);

const current = (): Api => {
  if (!api) throw new Error("hook não montou");
  return api;
};

describe("useCloseOnce", () => {
  beforeEach(() => {
    api = null;
    navigationSpies.back.mockClear();
  });

  it("um fechamento pedido volta uma entrada, só uma vez", () => {
    render(<Host mode="visible" />);
    act(() => current().requestClose());
    act(() => current().requestClose());
    act(() => current().onClosed());
    expect(navigationSpies.back).toHaveBeenCalledTimes(1);
  });

  it("o fim da saída sem pedido (rota escondida pelo Activity) não volta no histórico", () => {
    const { rerender } = render(<Host mode="visible" />);
    rerender(<Host mode="hidden" />);
    act(() => current().onClosed());
    expect(navigationSpies.back).not.toHaveBeenCalled();
  });

  it("esconder no meio da saída cancela o pedido: o Avançar reabre sem voltar", () => {
    const { rerender } = render(<Host mode="visible" />);
    act(() => current().requestClose());
    rerender(<Host mode="hidden" />);
    act(() => current().onClosed());
    expect(navigationSpies.back).not.toHaveBeenCalled();
  });
});
