import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { makeRow } from "../../lib/comparison";
import { ComparisonTable, type ComparisonTableMessages } from "./ComparisonTable";

const MESSAGES: ComparisonTableMessages = {
  caption: "Comparação entre A e B",
  cornerLabel: "Característica",
  onlyDifferences: "Mostrar só diferenças",
  legend: "Linhas marcadas mudam.",
  scrollHint: "Arraste para o lado.",
  differs: ", diferente",
  empty: "Tudo igual.",
  announce: (visible, total) => `Mostrando ${visible} de ${total} linhas.`,
};

const COLUMNS = [
  { id: 1, header: "Hotel A" },
  { id: 2, header: "Hotel B" },
];

const rows = [
  {
    ...makeRow("price", "Preço", "text", ["R$ 800", "R$ 900"]),
    best: [0],
    bestLabel: "Menor preço",
  },
  makeRow("type", "Tipo", "text", ["Hotel", "Hotel"]),
];

describe("ComparisonTable", () => {
  it("renderiza caption, colunas e o selo de texto só na coluna melhor", () => {
    render(<ComparisonTable columns={COLUMNS} rows={rows} messages={MESSAGES} />);
    const table = screen.getByRole("table", { name: "Comparação entre A e B" });
    expect(within(table).getByRole("columnheader", { name: "Hotel A" })).toBeInTheDocument();
    expect(within(table).getAllByText("Menor preço")).toHaveLength(1);
    expect(within(table).getByRole("rowheader", { name: /^Preço/ })).toHaveTextContent(
      ", diferente",
    );
    expect(within(table).getByRole("rowheader", { name: /^Tipo/ })).not.toHaveTextContent(
      ", diferente",
    );
  });

  it("só diferenças filtra e anuncia", async () => {
    const user = userEvent.setup();
    render(<ComparisonTable columns={COLUMNS} rows={rows} messages={MESSAGES} />);
    expect(screen.getByText("Mostrando 2 de 2 linhas.")).toBeInTheDocument();
    await user.click(screen.getByRole("checkbox", { name: "Mostrar só diferenças" }));
    expect(screen.getByText("Mostrando 1 de 2 linhas.")).toBeInTheDocument();
    expect(screen.queryByRole("rowheader", { name: /^Tipo/ })).not.toBeInTheDocument();
  });

  it("sem nenhuma linha diferente mostra a mensagem única", async () => {
    const user = userEvent.setup();
    const same = [makeRow("type", "Tipo", "text", ["Hotel", "Hotel"])];
    render(<ComparisonTable columns={COLUMNS} rows={same} messages={MESSAGES} />);
    await user.click(screen.getByRole("checkbox", { name: "Mostrar só diferenças" }));
    expect(screen.getByText("Tudo igual.")).toBeInTheDocument();
  });

  it("a região rolável é focável e nomeada pela caption", () => {
    render(<ComparisonTable columns={COLUMNS} rows={rows} messages={MESSAGES} />);
    const region = screen.getByRole("region", { name: "Comparação entre A e B" });
    expect(region).toHaveAttribute("tabindex", "0");
  });
});
