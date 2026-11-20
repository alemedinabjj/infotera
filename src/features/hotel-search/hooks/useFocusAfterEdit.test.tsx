import { render } from "@testing-library/react";
import { useRef } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { markFocusAfterNavigation } from "@/shared/lib/focus-after-navigation";
import { useFocusAfterEdit } from "./useFocusAfterEdit";

vi.mock("@/shared/lib/scroll", () => ({ revealBelowHeader: vi.fn() }));

const Heading = () => {
  const ref = useRef<HTMLHeadingElement>(null);
  useFocusAfterEdit(ref);
  return (
    <h1 ref={ref} tabIndex={-1}>
      Hotéis
    </h1>
  );
};

afterEach(() => window.history.replaceState(null, "", "/"));

describe("useFocusAfterEdit", () => {
  it("foca o h1 quando a página chega ao destino marcado pelo envio válido", () => {
    markFocusAfterNavigation("/search?destination=Rio");
    window.history.replaceState(null, "", "/search?destination=Rio");
    const { getByRole } = render(<Heading />);
    expect(getByRole("heading", { level: 1 })).toHaveFocus();
  });

  it("não mexe no foco numa carga normal", () => {
    const { getByRole } = render(<Heading />);
    expect(getByRole("heading", { level: 1 })).not.toHaveFocus();
  });

  it("um envio marcado para outra URL não rouba o foco", () => {
    markFocusAfterNavigation("/search?destination=Rio");
    window.history.replaceState(null, "", "/search?destination=Bonito");
    const { getByRole } = render(<Heading />);
    expect(getByRole("heading", { level: 1 })).not.toHaveFocus();
  });
});
