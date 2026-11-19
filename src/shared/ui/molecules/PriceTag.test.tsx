import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { PriceTag } from "./PriceTag";

describe("PriceTag", () => {
  it("nightly: a partir de / valor / por noite", () => {
    render(<PriceTag variant="nightly" nightly={890} />);
    expect(screen.getByText("R$ 890")).toBeInTheDocument();
    expect(screen.getByText("a partir de")).toBeInTheDocument();
  });

  it("stay: total em destaque e diária 'a partir de'", () => {
    const { container } = render(
      <PriceTag variant="stay" total={540} nights={3} rooms={1} nightly={180} />,
    );
    expect(container).toHaveTextContent("R$ 540,00");
    expect(container).toHaveTextContent("total · 3 noites · 1 quarto");
    expect(container).toHaveTextContent("a partir de R$ 180 por noite");
  });

  it("stay com exactNightly: diária exata, sem 'a partir de'", () => {
    const { container } = render(
      <PriceTag variant="stay" total={2400} nights={3} rooms={1} nightly={800} exactNightly />,
    );
    expect(container).toHaveTextContent("R$ 2.400,00");
    expect(container).toHaveTextContent("R$ 800 por noite");
    expect(container).not.toHaveTextContent("a partir de");
  });

  it("nightly-inline: frase corrida com o valor grande", () => {
    const { container } = render(<PriceTag variant="nightly-inline" nightly={800} />);
    expect(container).toHaveTextContent("a partir de R$ 800 por noite");
    expect(screen.getByText("R$ 800")).toHaveClass("text-2xl");
  });

  it("room-nightly: valor e 'por noite', sem 'a partir de'", () => {
    const { container } = render(<PriceTag variant="room-nightly" nightly={1200} />);
    expect(container).toHaveTextContent("R$ 1.200por noite");
    expect(container).not.toHaveTextContent("a partir de");
  });

  it("nightly-line: linha discreta", () => {
    const { container } = render(<PriceTag variant="nightly-line" nightly={1200.5} />);
    expect(container).toHaveTextContent("a partir de R$ 1.200,50 por noite");
  });
});
