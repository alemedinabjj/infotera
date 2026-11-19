import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { Gallery } from "./Gallery";

const photos = (count: number) =>
  Array.from({ length: count }, (_, i) => `https://images.unsplash.com/photo-${i + 1}`);

const NAME = "Hotel Copacabana Palace";

const openAll = async (count = 5) => {
  const user = userEvent.setup();
  render(<Gallery name={NAME} images={photos(count)} />);
  await user.click(screen.getByRole("button", { name: `Ver todas as fotos (${count})` }));
  return { user, dialog: screen.getByRole("dialog", { name: `Fotos de ${NAME}` }) };
};

describe("Gallery (critério 9)", () => {
  it("foto principal + 4 miniaturas, cada uma um botão 'Abrir foto N de 5'", () => {
    render(<Gallery name={NAME} images={photos(5)} />);
    for (let n = 1; n <= 5; n += 1) {
      expect(screen.getByRole("button", { name: `Abrir foto ${n} de 5` })).toBeInTheDocument();
    }
    const thumb = screen.getByRole("button", { name: "Abrir foto 3 de 5" });
    expect(thumb.querySelector("img")).toHaveAttribute("loading", "lazy");
    expect(thumb.querySelector("img")).toHaveAttribute("alt", "");
    const main = screen.getByRole("button", { name: "Abrir foto 1 de 5" });
    expect(main.querySelector("img")).toHaveAttribute("loading", "eager");
    expect(screen.getByRole("button", { name: "Ver todas as fotos (5)" })).toBeInTheDocument();
  });

  it("mais de 5 fotos: faixa '+3 fotos' na última miniatura, sem botões extras", () => {
    render(<Gallery name={NAME} images={photos(8)} />);
    expect(screen.getByText("+3 fotos")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Abrir foto 6 de 8" })).not.toBeInTheDocument();
  });

  it("1 foto: sem 'Ver todas', a própria foto abre o lightbox sem setas nem contador", async () => {
    const user = userEvent.setup();
    render(<Gallery name={NAME} images={photos(1)} />);
    expect(screen.queryByRole("button", { name: /Ver todas/ })).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Abrir foto 1 de 1" }));
    const dialog = screen.getByRole("dialog", { name: `Fotos de ${NAME}` });
    expect(within(dialog).queryByRole("button", { name: "Próxima foto" })).not.toBeInTheDocument();
    expect(within(dialog).queryByText(/Foto 1 de 1/)).not.toBeInTheDocument();
    expect(within(dialog).getByRole("img", { name: `${NAME}, foto 1 de 1` })).toBeInTheDocument();
  });

  it("sem fotos não renderiza nada", () => {
    const { container } = render(<Gallery name={NAME} images={[]} />);
    expect(container).toBeEmptyDOMElement();
  });
});

describe("Lightbox (critério 10)", () => {
  it("'Ver todas' abre na foto 1, com título, contador e foco em 'Próxima foto'", async () => {
    const { dialog } = await openAll();
    expect(within(dialog).getByRole("heading", { name: `Fotos de ${NAME}` })).toBeInTheDocument();
    expect(within(dialog).getByText("Foto 1 de 5")).toHaveAttribute("aria-live", "polite");
    expect(within(dialog).getByRole("img", { name: `${NAME}, foto 1 de 5` })).toBeInTheDocument();
    expect(within(dialog).getByRole("button", { name: "Próxima foto" })).toHaveFocus();
  });

  it("→ e ← trocam a foto, dando a volta (5 → 1 e 1 → 5)", async () => {
    const { user, dialog } = await openAll();
    await user.keyboard("{ArrowRight}");
    expect(within(dialog).getByText("Foto 2 de 5")).toBeInTheDocument();
    expect(within(dialog).getByRole("img", { name: `${NAME}, foto 2 de 5` })).toBeInTheDocument();
    await user.keyboard("{ArrowLeft}{ArrowLeft}");
    expect(within(dialog).getByText("Foto 5 de 5")).toBeInTheDocument();
    await user.keyboard("{ArrowRight}");
    expect(within(dialog).getByText("Foto 1 de 5")).toBeInTheDocument();
  });

  it("Home e End vão às pontas", async () => {
    const { user, dialog } = await openAll();
    await user.keyboard("{End}");
    expect(within(dialog).getByText("Foto 5 de 5")).toBeInTheDocument();
    await user.keyboard("{Home}");
    expect(within(dialog).getByText("Foto 1 de 5")).toBeInTheDocument();
  });

  it("os botões anterior/próxima também trocam a foto", async () => {
    const { user, dialog } = await openAll();
    await user.click(within(dialog).getByRole("button", { name: "Foto anterior" }));
    expect(within(dialog).getByText("Foto 5 de 5")).toBeInTheDocument();
    await user.click(within(dialog).getByRole("button", { name: "Próxima foto" }));
    expect(within(dialog).getByText("Foto 1 de 5")).toBeInTheDocument();
  });

  it("clicar numa miniatura abre naquela foto", async () => {
    const user = userEvent.setup();
    render(<Gallery name={NAME} images={photos(5)} />);
    await user.click(screen.getByRole("button", { name: "Abrir foto 3 de 5" }));
    expect(screen.getByText("Foto 3 de 5")).toBeInTheDocument();
  });

  it("Esc (evento cancel do <dialog>) fecha e o foco volta ao botão que abriu", async () => {
    const { dialog } = await openAll();
    const trigger = screen.getByRole("button", { name: "Ver todas as fotos (5)" });
    fireEvent(dialog, new Event("cancel", { cancelable: true }));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(trigger).toHaveFocus();
  });

  it("Fechar devolve o foco à miniatura que abriu", async () => {
    const user = userEvent.setup();
    render(<Gallery name={NAME} images={photos(5)} />);
    const thumb = screen.getByRole("button", { name: "Abrir foto 2 de 5" });
    await user.click(thumb);
    await user.click(screen.getByRole("button", { name: "Fechar" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(thumb).toHaveFocus();
  });

  it("foto quebrada mostra o aviso e as setas continuam", async () => {
    const { user, dialog } = await openAll();
    const img = within(dialog).getByRole("img", { name: `${NAME}, foto 1 de 5` });
    img.dispatchEvent(new Event("error"));
    expect(
      await within(dialog).findByText("Não foi possível carregar esta foto."),
    ).toBeInTheDocument();
    await user.keyboard("{ArrowRight}");
    expect(within(dialog).getByText("Foto 2 de 5")).toBeInTheDocument();
  });
});

describe("Lightbox: arrastar para trocar de foto", () => {
  const drag = (target: Element, from: number, to: number, pointerId = 1) => {
    fireEvent.pointerDown(target, { pointerId, isPrimary: true, clientX: from, clientY: 100 });
    fireEvent.pointerUp(target, { pointerId, isPrimary: true, clientX: to, clientY: 104 });
  };

  it("arrastar para a esquerda avança e para a direita volta (limiar de 50px)", async () => {
    const { dialog } = await openAll();
    const area = within(dialog)
      .getByRole("img", { name: `${NAME}, foto 1 de 5` })
      .closest(".touch-pan-y");
    if (!area) throw new Error("área de gesto ausente");
    drag(area, 300, 200);
    expect(within(dialog).getByText("Foto 2 de 5")).toBeInTheDocument();
    drag(area, 100, 120);
    expect(within(dialog).getByText("Foto 2 de 5")).toBeInTheDocument();
    drag(area, 100, 200);
    expect(within(dialog).getByText("Foto 1 de 5")).toBeInTheDocument();
  });

  it("com 1 foto o gesto não faz nada", async () => {
    const user = userEvent.setup();
    render(<Gallery name={NAME} images={photos(1)} />);
    await user.click(screen.getByRole("button", { name: "Abrir foto 1 de 1" }));
    const dialog = screen.getByRole("dialog", { name: `Fotos de ${NAME}` });
    const area = within(dialog).getByRole("img").closest(".touch-pan-y");
    if (!area) throw new Error("área de gesto ausente");
    drag(area, 300, 100);
    expect(within(dialog).getByRole("img", { name: `${NAME}, foto 1 de 1` })).toBeInTheDocument();
  });
});
