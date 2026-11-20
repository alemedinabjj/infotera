import { act, fireEvent, render, screen } from "@testing-library/react";
import { useRef } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useDeferredBlur } from "./useDeferredBlur";

const validate = vi.fn<() => void>();
let cancel: () => void = () => undefined;

const Harness = () => {
  const ref = useRef<HTMLDivElement>(null);
  const blur = useDeferredBlur(ref);
  cancel = blur.cancel;
  return (
    <div ref={ref}>
      <input aria-label="campo" onBlur={() => blur.defer(validate)} />
      <button type="button">botão</button>
      <p>texto</p>
    </div>
  );
};

beforeEach(() => {
  vi.useFakeTimers();
  render(<Harness />);
});

afterEach(() => {
  vi.useRealTimers();
  validate.mockReset();
});

const field = () => screen.getByLabelText("campo");

describe("useDeferredBlur", () => {
  it("sem botão pressionado valida o blur na hora", () => {
    fireEvent.focusOut(field());
    expect(validate).toHaveBeenCalledOnce();
  });

  it("pressionar um botão adia o blur até depois do click", () => {
    fireEvent.pointerDown(screen.getByRole("button"));
    fireEvent.focusOut(field());
    expect(validate).not.toHaveBeenCalled();
    fireEvent.pointerUp(screen.getByRole("button"));
    fireEvent.click(screen.getByRole("button"));
    expect(validate).not.toHaveBeenCalled(); // depois dos handlers do click
    act(() => vi.advanceTimersByTime(0));
    expect(validate).toHaveBeenCalledOnce();
  });

  it("sem click (soltou fora do botão) valida 400 ms depois de soltar", () => {
    fireEvent.pointerDown(screen.getByRole("button"));
    fireEvent.focusOut(field());
    fireEvent.pointerUp(document.body); // soltou fora do container
    act(() => vi.advanceTimersByTime(399));
    expect(validate).not.toHaveBeenCalled();
    act(() => vi.advanceTimersByTime(1));
    expect(validate).toHaveBeenCalledOnce();
  });

  it("pressionar fora de botões não adia nada", () => {
    fireEvent.pointerDown(screen.getByText("texto"));
    fireEvent.focusOut(field());
    expect(validate).toHaveBeenCalledOnce();
  });

  it("depois de resolvido, o próximo blur volta a validar na hora", () => {
    fireEvent.pointerDown(screen.getByRole("button"));
    fireEvent.click(screen.getByRole("button"));
    act(() => vi.advanceTimersByTime(0));
    fireEvent.focusOut(field());
    expect(validate).toHaveBeenCalledOnce();
  });

  it("cancel descarta o que estava pendente", () => {
    fireEvent.pointerDown(screen.getByRole("button"));
    fireEvent.focusOut(field());
    act(() => cancel());
    fireEvent.click(screen.getByRole("button"));
    act(() => vi.advanceTimersByTime(1000));
    expect(validate).not.toHaveBeenCalled();
  });
});
