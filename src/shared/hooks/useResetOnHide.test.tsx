import { act, render } from "@testing-library/react";
import { Activity, useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { useResetOnHide } from "./useResetOnHide";

const Probe = ({ reset }: { reset: () => void }) => {
  useResetOnHide(reset);
  return <p>probe</p>;
};

describe("useResetOnHide", () => {
  it("não chama reset enquanto está visível", () => {
    const reset = vi.fn();
    render(<Probe reset={reset} />);
    expect(reset).not.toHaveBeenCalled();
  });

  it("chama reset ao desmontar", () => {
    const reset = vi.fn();
    const { unmount } = render(<Probe reset={reset} />);
    unmount();
    expect(reset).toHaveBeenCalledTimes(1);
  });

  it("chama reset ao esconder com Activity e não ao mostrar de novo", () => {
    const reset = vi.fn();
    const Host = ({ mode }: { mode: "visible" | "hidden" }) => (
      <Activity mode={mode}>
        <Probe reset={reset} />
      </Activity>
    );
    const { rerender } = render(<Host mode="visible" />);
    rerender(<Host mode="hidden" />);
    expect(reset).toHaveBeenCalledTimes(1);
    rerender(<Host mode="visible" />);
    expect(reset).toHaveBeenCalledTimes(1);
  });

  it("usa a versão mais recente do reset sem rodar de novo a cada render", () => {
    const first = vi.fn();
    const second = vi.fn();
    const { rerender, unmount } = render(<Probe reset={first} />);
    rerender(<Probe reset={second} />);
    expect(first).not.toHaveBeenCalled();
    unmount();
    expect(second).toHaveBeenCalledTimes(1);
    expect(first).not.toHaveBeenCalled();
  });

  it("zera o estado local ao esconder", () => {
    const Field = () => {
      const [open, setOpen] = useState(false);
      useResetOnHide(() => setOpen(false));
      return (
        <button type="button" aria-expanded={open} onClick={() => setOpen(true)}>
          abrir
        </button>
      );
    };
    const Host = ({ mode }: { mode: "visible" | "hidden" }) => (
      <Activity mode={mode}>
        <Field />
      </Activity>
    );
    const { rerender, getByRole } = render(<Host mode="visible" />);
    act(() => getByRole("button").click());
    expect(getByRole("button").getAttribute("aria-expanded")).toBe("true");
    rerender(<Host mode="hidden" />);
    rerender(<Host mode="visible" />);
    expect(getByRole("button").getAttribute("aria-expanded")).toBe("false");
  });
});
