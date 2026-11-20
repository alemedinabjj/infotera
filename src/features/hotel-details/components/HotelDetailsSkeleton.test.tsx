import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { HotelDetailsSkeleton } from "./HotelDetailsSkeleton";

describe("HotelDetailsSkeleton", () => {
  it("região status com o aviso de demora já no HTML, revelado por CSS (sem JS)", () => {
    render(<HotelDetailsSkeleton />);
    const status = screen.getByRole("status");
    expect(status).toHaveTextContent("Carregando hotel…");
    const slow = screen.getByText("Está demorando mais que o normal…");
    expect(status).toContainElement(slow);
    expect(slow).toHaveClass("invisible", "animate-slow-notice");
  });
});
