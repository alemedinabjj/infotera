import { fireEvent, render, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { MapTile } from "./MapTile";

const STYLE = { left: "0%", top: "0%", width: "50%", height: "50%" };
const tile = (container: HTMLElement): HTMLImageElement => {
  const image = container.querySelector("img");
  if (!image) throw new Error("tile ausente");
  return image;
};

describe("MapTile", () => {
  it("nasce invisível e só aparece depois de carregar", async () => {
    const { container } = render(
      <MapTile src="https://tile.openstreetmap.org/15/1/1.png" style={STYLE} />,
    );
    expect(tile(container)).toHaveClass("invisible");
    fireEvent.load(tile(container));
    await waitFor(() => expect(tile(container)).not.toHaveClass("invisible"));
  });

  it("tile que falha continua invisível (sem ícone de imagem quebrada)", () => {
    const { container } = render(
      <MapTile src="https://tile.openstreetmap.org/15/1/1.png" style={STYLE} />,
    );
    fireEvent.error(tile(container));
    expect(tile(container)).toHaveClass("invisible");
  });
});
