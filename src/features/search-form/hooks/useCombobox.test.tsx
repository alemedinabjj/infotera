import { act, render, screen } from "@testing-library/react";
import { Activity, useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { useCombobox } from "./useCombobox";

const Combo = () => {
  const combo = useCombobox({
    itemKeys: ["a", "b"],
    canOpen: true,
    closeOnTab: true,
    onSelect: vi.fn(),
    onEscapeClosed: vi.fn(),
    onLeave: vi.fn(),
  });
  return (
    <div {...combo.wrapperProps}>
      <input aria-label="Destino" {...combo.inputProps} onFocus={combo.open} />
    </div>
  );
};

const Host = () => {
  const [mode, setMode] = useState<"visible" | "hidden">("visible");
  return (
    <>
      <button
        type="button"
        onClick={() => setMode((m) => (m === "visible" ? "hidden" : "visible"))}
      >
        alternar
      </button>
      <Activity mode={mode}>
        <Combo />
      </Activity>
    </>
  );
};

describe("useCombobox dentro de Activity (F7c, critério 25)", () => {
  it("volta com a lista fechada depois de a rota ser escondida", () => {
    render(<Host />);
    const input = screen.getByRole("combobox", { hidden: true });
    act(() => input.focus());
    expect(input).toHaveAttribute("aria-expanded", "true");

    act(() => screen.getByRole("button", { name: "alternar" }).click());
    act(() => screen.getByRole("button", { name: "alternar" }).click());

    expect(screen.getByRole("combobox")).toHaveAttribute("aria-expanded", "false");
  });
});
