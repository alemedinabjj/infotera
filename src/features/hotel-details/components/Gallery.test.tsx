import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Gallery } from "./Gallery";

const photos = (count: number) =>
  Array.from({ length: count }, (_, i) => `https://images.unsplash.com/photo-${i + 1}`);

describe("Gallery: links para a rota da foto (F7c, critério 12 e 19)", () => {
  it("foto principal + 4 miniaturas, cada uma um link 'Abrir foto N de 5' para /photos/N", () => {
    render(<Gallery locale="pt-BR" hotelId={1} images={photos(5)} />);
    for (let n = 1; n <= 5; n += 1) {
      expect(screen.getByRole("link", { name: `Abrir foto ${n} de 5` })).toHaveAttribute(
        "href",
        `/hotel/1/photos/${n}`,
      );
    }
    const thumb = screen.getByRole("link", { name: "Abrir foto 3 de 5" });
    expect(thumb.querySelector("img")).toHaveAttribute("loading", "lazy");
    expect(thumb.querySelector("img")).toHaveAttribute("alt", "");
    expect(
      screen.getByRole("link", { name: "Abrir foto 1 de 5" }).querySelector("img"),
    ).toHaveAttribute("loading", "eager");
  });

  it("'Ver todas as fotos' é um link para a foto 1", () => {
    render(<Gallery locale="pt-BR" hotelId={1} images={photos(5)} />);
    expect(screen.getByRole("link", { name: "Ver todas as fotos (5)" })).toHaveAttribute(
      "href",
      "/hotel/1/photos/1",
    );
  });

  it("em en-US as URLs ganham /en", () => {
    render(<Gallery locale="en-US" hotelId={12} images={photos(3)} />);
    expect(screen.getByRole("link", { name: "Open photo 2 of 3" })).toHaveAttribute(
      "href",
      "/en/hotel/12/photos/2",
    );
    expect(screen.getByRole("link", { name: "See all photos (3)" })).toBeInTheDocument();
  });

  it("mais de 5 fotos: faixa '+3 fotos' na última miniatura, sem links extras", () => {
    render(<Gallery locale="pt-BR" hotelId={1} images={photos(8)} />);
    expect(screen.getByText("+3 fotos")).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Abrir foto 6 de 8" })).not.toBeInTheDocument();
  });

  it("1 foto: sem 'Ver todas'; a própria foto é o link", () => {
    render(<Gallery locale="pt-BR" hotelId={1} images={photos(1)} />);
    expect(screen.queryByRole("link", { name: /Ver todas/ })).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Abrir foto 1 de 1" })).toHaveAttribute(
      "href",
      "/hotel/1/photos/1",
    );
  });

  it("sem fotos não renderiza nada", () => {
    const { container } = render(<Gallery locale="pt-BR" hotelId={1} images={[]} />);
    expect(container).toBeEmptyDOMElement();
  });
});
