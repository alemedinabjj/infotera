import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { renderWithProviders } from "@/shared/testing/render";
import { PhotoViewer } from "./PhotoViewer";

const NAME = "Hotel Copacabana Palace";
const photos = (count: number) =>
  Array.from({ length: count }, (_, i) => `https://images.unsplash.com/photo-${i + 1}`);

const renderViewer = (count = 5, locale: "pt-BR" | "en-US" = "pt-BR") =>
  renderWithProviders(
    <>
      <h1 id="titulo">Fotos de {NAME}</h1>
      <PhotoViewer
        hotelId={1}
        name={NAME}
        images={photos(count)}
        initialIndex={2}
        headingId="titulo"
      />
    </>,
    { locale },
  );

beforeEach(() => {
  vi.spyOn(window.history, "replaceState");
});
afterEach(() => vi.restoreAllMocks());

describe("PhotoViewer (página cheia, critério 16)", () => {
  it("foto 3 de 5 com alt, grupo rotulado pelo h1 e setas abaixo", () => {
    renderViewer();
    expect(screen.getByRole("group", { name: `Fotos de ${NAME}` })).toBeInTheDocument();
    expect(screen.getByRole("img", { name: `${NAME}, foto 3 de 5` })).toBeInTheDocument();
    expect(screen.getByText("Foto 3 de 5")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Foto anterior" })).toBeInTheDocument();
  });

  it("as setas trocam foto, URL (replaceState) e título da aba, sem navegar", async () => {
    const user = userEvent.setup();
    renderViewer();
    await user.click(screen.getByRole("button", { name: "Próxima foto" }));
    expect(screen.getByText("Foto 4 de 5")).toBeInTheDocument();
    expect(window.history.replaceState).toHaveBeenLastCalledWith(null, "", "/hotel/1/photos/4");
    expect(document.title).toBe(`Foto 4 de 5 · ${NAME} | Infotera Hotéis`);
  });

  it("←/→ com foco em um controle trocam a foto; a volta ao início é circular", async () => {
    const user = userEvent.setup();
    renderViewer();
    screen.getByRole("button", { name: "Próxima foto" }).focus();
    await user.keyboard("{ArrowRight}{ArrowRight}{ArrowRight}");
    expect(screen.getByText("Foto 1 de 5")).toBeInTheDocument();
    await user.keyboard("{ArrowLeft}");
    expect(screen.getByText("Foto 5 de 5")).toBeInTheDocument();
  });

  it("em en-US o título da aba e a URL ficam em inglês", async () => {
    const user = userEvent.setup();
    renderViewer(5, "en-US");
    await user.click(screen.getByRole("button", { name: "Next photo" }));
    expect(document.title).toBe(`Photo 4 of 5 · ${NAME} | Infotera Hotéis`);
    expect(window.history.replaceState).toHaveBeenLastCalledWith(null, "", "/en/hotel/1/photos/4");
  });

  it("1 foto: sem setas nem contador", () => {
    renderViewer(1);
    expect(screen.queryByRole("button", { name: "Próxima foto" })).not.toBeInTheDocument();
    expect(screen.queryByText(/Foto 1 de 1/)).not.toBeInTheDocument();
  });
});
