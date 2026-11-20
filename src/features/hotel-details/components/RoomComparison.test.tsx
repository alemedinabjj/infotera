import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { makeRoom } from "@/shared/testing/fixtures";
import { seedRooms } from "@/shared/testing/seed";
import { RoomComparison } from "./RoomComparison";

const open = async (rooms = seedRooms(18)) => {
  const user = userEvent.setup();
  render(<RoomComparison rooms={rooms} />);
  await user.click(screen.getByRole("button", { name: `Comparar quartos (${rooms.length})` }));
  return { user, table: screen.getByRole("table", { name: "Comparar quartos" }) };
};

describe("RoomComparison: tabela (critério 25)", () => {
  it("recolhida por padrão, com o disclosure em h3", () => {
    render(<RoomComparison rooms={seedRooms(18)} />);
    const button = screen.getByRole("button", { name: "Comparar quartos (4)" });
    expect(button).toHaveAttribute("aria-expanded", "false");
    expect(button.closest("h3")).not.toBeNull();
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
  });

  it("caption, uma coluna por quarto e linhas com th scope=row", async () => {
    const { table } = await open();
    const headers = within(table).getAllByRole("columnheader");
    expect(headers.map((header) => header.textContent)).toEqual([
      "Característica",
      "Suíte Júnior",
      "Quarto Twin",
      "Quarto Triplo",
      "Quarto Executivo",
    ]);
    for (const header of headers) expect(header).toHaveAttribute("scope", "col");
    for (const label of ["Preço por noite", "Tamanho", "Hóspedes", "Camas", "Disponibilidade"]) {
      expect(
        within(table).getByRole("rowheader", { name: new RegExp(`^${label}`) }),
      ).toHaveAttribute("scope", "row");
    }
    expect(within(table).getByRole("rowheader", { name: /^Cozinha/ })).toBeInTheDocument();
  });

  it("linhas que diferem: texto sr-only e faixa; booleanos com ícone e Sim/Não", async () => {
    const { table } = await open();
    const price = within(table).getByRole("rowheader", { name: /^Preço por noite/ });
    expect(price).toHaveTextContent("Preço por noite, diferente entre os quartos");
    expect(price.className).toContain("border-primary");
    const kitchen = within(table)
      .getByRole("rowheader", { name: /^Cozinha/ })
      .closest("tr") as HTMLElement;
    expect(within(kitchen).getAllByText("Sim")).toHaveLength(1);
    expect(within(kitchen).getAllByText("Não")).toHaveLength(3);
    expect(kitchen.querySelectorAll("svg[aria-hidden='true']")).toHaveLength(4);
  });

  it("só as linhas que diferem ganham faixa; as iguais ficam sem destaque", async () => {
    const rooms = [
      makeRoom({ id: 1, name: "A", pricePerNight: 100, amenities: ["safe"] }),
      makeRoom({ id: 2, name: "B", pricePerNight: 200, amenities: ["safe"] }),
    ];
    const { table } = await open(rooms);
    const rowOf = (name: RegExp) =>
      within(table).getByRole("rowheader", { name }).closest("tr") as HTMLElement;
    expect(rowOf(/^Preço por noite/).className).toContain("bg-primary-soft");
    expect(rowOf(/^Cofre/).className).not.toContain("bg-primary-soft");
  });

  it("quando todas as linhas diferem, só o marcador (sem faixa)", async () => {
    const rooms = [
      makeRoom({
        id: 1,
        name: "A",
        pricePerNight: 100,
        size: 20,
        maxGuests: 2,
        available: 1,
        beds: [{ type: "king", quantity: 1 }],
        amenities: ["safe"],
      }),
      makeRoom({
        id: 2,
        name: "B",
        pricePerNight: 200,
        size: 30,
        maxGuests: 3,
        available: 4,
        beds: [{ type: "twin", quantity: 2 }],
        amenities: ["aircon"],
      }),
    ];
    const { table } = await open(rooms);
    const price = within(table).getByRole("rowheader", { name: /^Preço por noite/ });
    expect(price.className).toContain("border-primary");
    expect(table.querySelector(".bg-primary-soft")).toBeNull();
  });

  it("'Ar-condicionado' não quebra no hífen (hífen sem quebra)", async () => {
    const { table } = await open();
    const header = within(table).getByRole("rowheader", { name: /^Ar.condicionado/ });
    expect(header.textContent).toContain("Ar\u2011condicionado");
    expect(header.className).toContain("hyphens-none");
  });

  it("legenda visual e dica de rolagem", async () => {
    await open();
    expect(screen.getByText("Linhas marcadas mudam entre os quartos.")).toBeInTheDocument();
    expect(screen.getByText("Arraste para o lado para ver todos.")).toBeInTheDocument();
  });
});

describe("RoomComparison: só diferenças (critério 26)", () => {
  const same = [
    makeRoom({ id: 1, name: "A", maxGuests: 2, size: 30, amenities: ["aircon"] }),
    makeRoom({ id: 2, name: "B", maxGuests: 2, size: 45, amenities: ["aircon"] }),
  ];

  it("esconde as linhas iguais, desmarcar volta todas, e o foco fica no checkbox", async () => {
    const { user, table } = await open(same);
    const total = within(table).getAllByRole("row").length - 1;
    const checkbox = screen.getByRole("checkbox", { name: "Mostrar só diferenças" });
    await user.click(checkbox);
    expect(checkbox).toBeChecked();
    expect(checkbox).toHaveFocus();
    expect(within(table).queryByRole("rowheader", { name: /^Hóspedes/ })).not.toBeInTheDocument();
    expect(
      within(table).queryByRole("rowheader", { name: /^Ar-condicionado/ }),
    ).not.toBeInTheDocument();
    expect(within(table).getByRole("rowheader", { name: /^Tamanho/ })).toBeInTheDocument();
    expect(
      screen.getByText(new RegExp(`^Mostrando \\d+ de ${total} características$`)),
    ).toBeInTheDocument();

    await user.click(checkbox);
    expect(checkbox).toHaveFocus();
    expect(within(table).getByRole("rowheader", { name: /^Hóspedes/ })).toBeInTheDocument();
    expect(screen.getByText(`Mostrando todas as ${total} características`)).toHaveAttribute(
      "aria-live",
      "polite",
    );
  });

  it("nenhuma linha diferente: mensagem única", async () => {
    const twins = [makeRoom({ id: 1, name: "A" }), makeRoom({ id: 2, name: "B" })];
    const { user, table } = await open(twins);
    await user.click(screen.getByRole("checkbox", { name: "Mostrar só diferenças" }));
    expect(
      within(table).getByText("Os quartos têm as mesmas características."),
    ).toBeInTheDocument();
  });
});

describe("RoomComparison: região (critério 27)", () => {
  it("região rotulada pelo título e focável por teclado", async () => {
    const { user } = await open();
    const region = screen.getByRole("region", { name: "Comparar quartos (4)" });
    expect(region).toHaveAttribute("tabindex", "0");
    expect(region.className).toContain("overflow-x-auto");
    await user.tab(); // checkbox
    await user.tab(); // região
    expect(region).toHaveFocus();
  });
});
