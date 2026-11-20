import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { navigationSpies } from "@/shared/testing/next-navigation";
import { renderWithProviders } from "@/shared/testing/render";
import { Gallery } from "./Gallery";
import { PhotoModal } from "./PhotoModal";

vi.mock(
  "next/navigation",
  async () => (await import("@/shared/testing/next-navigation")).navigationMock,
);

const NAME = "Hotel Copacabana Palace";
const photos = (count: number) =>
  Array.from({ length: count }, (_, i) => `https://images.unsplash.com/photo-${i + 1}`);

const Page = ({ count = 5, index = 2 }: { count?: number; index?: number }) => (
  <>
    <Gallery locale="pt-BR" hotelId={1} images={photos(count)} />
    <PhotoModal hotelId={1} name={NAME} images={photos(count)} initialIndex={index} />
  </>
);

const Host = () => {
  const [show, setShow] = useState(true);
  return (
    <>
      <button type="button" data-testid="voltar" onClick={() => setShow(false)}>
        simular Voltar
      </button>
      <Gallery locale="pt-BR" hotelId={1} images={photos(5)} />
      {show ? <PhotoModal hotelId={1} name={NAME} images={photos(5)} initialIndex={2} /> : null}
    </>
  );
};

const dialog = () => screen.getByRole("dialog", { name: `Fotos de ${NAME}` });

beforeEach(() => {
  navigationSpies.back.mockReset();
  vi.spyOn(window.history, "replaceState");
});
afterEach(() => vi.restoreAllMocks());

describe("PhotoModal: abrir (critério 12)", () => {
  it("abre na foto da URL, com nome, contador descrevendo o diálogo e foco em 'Próxima foto'", () => {
    renderWithProviders(<PhotoModal hotelId={1} name={NAME} images={photos(5)} initialIndex={2} />);
    const modal = dialog();
    expect(within(modal).getByText("Foto 3 de 5")).toBeInTheDocument();
    const counter = within(modal).getByText("Foto 3 de 5");
    expect(modal).toHaveAttribute("aria-describedby", counter.id);
    expect(within(modal).getByRole("button", { name: "Próxima foto" })).toHaveFocus();
    expect(within(modal).getByRole("img", { name: `${NAME}, foto 3 de 5` })).toBeInTheDocument();
  });

  it("1 foto: sem setas nem contador (o foco inicial é o 'Fechar' nativo do showModal)", () => {
    renderWithProviders(<PhotoModal hotelId={1} name={NAME} images={photos(1)} initialIndex={0} />);
    const modal = dialog();
    expect(within(modal).queryByRole("button", { name: "Próxima foto" })).not.toBeInTheDocument();
    expect(within(modal).queryByText(/Foto 1 de 1/)).not.toBeInTheDocument();
    expect(within(modal).getByRole("button", { name: "Fechar" })).toBeInTheDocument();
  });
});

describe("PhotoModal: trocar de foto (critério 13)", () => {
  it("→ três vezes volta à foto 1 e a URL acompanha por replaceState, sem navegar", async () => {
    const user = userEvent.setup();
    renderWithProviders(<PhotoModal hotelId={1} name={NAME} images={photos(5)} initialIndex={2} />);
    await user.keyboard("{ArrowRight}{ArrowRight}{ArrowRight}");
    expect(within(dialog()).getByText("Foto 1 de 5")).toBeInTheDocument();
    expect(window.history.replaceState).toHaveBeenLastCalledWith(null, "", "/hotel/1/photos/1");
    expect(navigationSpies.push).not.toHaveBeenCalled();
    expect(navigationSpies.back).not.toHaveBeenCalled();
  });

  it("Home e End vão às pontas; em en-US o path ganha /en", async () => {
    const user = userEvent.setup();
    renderWithProviders(
      <PhotoModal hotelId={1} name={NAME} images={photos(5)} initialIndex={2} />,
      {
        locale: "en-US",
      },
    );
    await user.keyboard("{End}");
    expect(window.history.replaceState).toHaveBeenLastCalledWith(null, "", "/en/hotel/1/photos/5");
    await user.keyboard("{Home}");
    expect(window.history.replaceState).toHaveBeenLastCalledWith(null, "", "/en/hotel/1/photos/1");
  });

  it("não escreve na URL enquanto a foto não muda", () => {
    renderWithProviders(<PhotoModal hotelId={1} name={NAME} images={photos(5)} initialIndex={2} />);
    expect(window.history.replaceState).not.toHaveBeenCalled();
  });
});

describe("PhotoModal: fechar (critérios 14 e 15, U3)", () => {
  it("Fechar fecha o dialog, devolve o foco ao link que abriu e faz um router.back()", async () => {
    const user = userEvent.setup();
    renderWithProviders(<Page />);
    const opener = screen.getByRole("link", { name: "Abrir foto 3 de 5" });
    fireEvent.click(opener);
    await user.click(within(dialog()).getByRole("button", { name: "Fechar" }));
    await waitFor(() => expect(navigationSpies.back).toHaveBeenCalledTimes(1));
    expect(opener).toHaveFocus();
  });

  it("Esc duas vezes (ou Esc + Fechar) gera um único router.back()", async () => {
    renderWithProviders(<Page />);
    const modal = dialog();
    fireEvent(modal, new Event("cancel", { cancelable: true }));
    fireEvent(modal, new Event("cancel", { cancelable: true }));
    fireEvent.click(within(modal).getByRole("button", { name: "Fechar" }));
    await waitFor(() => expect(navigationSpies.back).toHaveBeenCalled());
    expect(navigationSpies.back).toHaveBeenCalledTimes(1);
  });

  it("sem link registrado, o foco vai à foto principal (nunca ao body)", async () => {
    renderWithProviders(<Page />);
    fireEvent.click(within(dialog()).getByRole("button", { name: "Fechar" }));
    await waitFor(() => expect(navigationSpies.back).toHaveBeenCalled());
    expect(screen.getByRole("link", { name: "Abrir foto 1 de 5" })).toHaveFocus();
  });

  it("Voltar do navegador (desmontar sem close) também devolve o foco ao link que abriu", () => {
    renderWithProviders(<Host />);
    const opener = screen.getByRole("link", { name: "Abrir foto 4 de 5" });
    fireEvent.click(opener);
    fireEvent.click(screen.getByTestId("voltar"));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(opener).toHaveFocus();
  });
});
