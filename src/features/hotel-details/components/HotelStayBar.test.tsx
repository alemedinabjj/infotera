import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { markFocusAfterNavigation } from "@/shared/lib/focus-after-navigation";
import { makeSearchCriteria } from "@/shared/testing/fixtures";
import { HotelStayBar } from "./HotelStayBar";
import { StayEditProvider } from "./StayEditContext";

const criteria = makeSearchCriteria({ checkIn: "2026-12-12", checkOut: "2026-12-15" });
const SUMMARY = "12–15 dez · 3 noites · 2 adultos · 1 quarto";

const Form = () => (
  <form aria-label="Datas">
    <input name="checkIn" aria-label="Check-in" />
    <button type="submit">Ver disponibilidade</button>
  </form>
);

const Bar = ({
  keyOf = "a",
  ...props
}: Partial<Parameters<typeof HotelStayBar>[0]> & { keyOf?: string }) => (
  <StayEditProvider criteriaKey={keyOf}>
    <h2 id="quartos-titulo" tabIndex={-1}>
      Quartos
    </h2>
    <HotelStayBar
      criteria={criteria}
      summary={SUMMARY}
      pastDates={false}
      datesForm={<Form />}
      {...props}
    />
  </StayEditProvider>
);

const renderBar = (props: Partial<Parameters<typeof HotelStayBar>[0]> = {}) =>
  render(<Bar {...props} />);

describe("HotelStayBar: sem critérios (critério 21)", () => {
  it("aviso e formulário já abertos, sem disclosure", () => {
    renderBar({ criteria: null, summary: null });
    expect(screen.getByText("Escolha as datas para reservar")).toBeInTheDocument();
    expect(
      screen.getByText(
        "Com as datas e os hóspedes, mostramos o preço total e a disponibilidade de cada quarto.",
      ),
    ).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: "Check-in" })).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Alterar datas e hóspedes" }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("heading", { level: 3, name: "Alterar datas e hóspedes" }),
    ).toHaveAttribute("id", "stay-edit-title");
    expect(document.getElementById("stay-edit-panel")).toBeInTheDocument();
  });
});

describe("HotelStayBar: com critérios (critério 22)", () => {
  it("resumo e disclosure fechado; abre o mesmo formulário abaixo do botão", async () => {
    const user = userEvent.setup();
    renderBar();
    expect(screen.getByText("Sua estadia")).toBeInTheDocument();
    expect(screen.getByText(SUMMARY)).toBeInTheDocument();
    const toggle = screen.getByRole("button", { name: "Alterar datas e hóspedes" });
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    expect(toggle).toHaveAttribute("aria-controls", "stay-edit-panel");
    expect(screen.queryByRole("textbox", { name: "Check-in" })).not.toBeInTheDocument();

    await user.click(toggle);
    expect(toggle).toHaveAttribute("aria-expanded", "true");
    expect(toggle).toHaveFocus();
    const panel = document.getElementById("stay-edit-panel");
    expect(panel).toBeInTheDocument();
    expect(
      toggle.compareDocumentPosition(panel as HTMLElement) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();

    await user.click(toggle);
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    expect(document.getElementById("stay-edit-panel")).not.toBeInTheDocument();
  });

  it("datas passadas mostram o aviso", () => {
    renderBar({ pastDates: true });
    expect(screen.getByText("As datas desta busca já passaram")).toBeInTheDocument();
  });

  it("sem datas passadas, sem aviso", () => {
    renderBar();
    expect(screen.queryByText("As datas desta busca já passaram")).not.toBeInTheDocument();
  });

  it("critérios novos fecham o painel e o foco vai ao h2 Quartos (só depois de enviar)", async () => {
    const user = userEvent.setup();
    const { rerender } = renderBar();
    await user.click(screen.getByRole("button", { name: "Alterar datas e hóspedes" }));
    await user.click(screen.getByRole("button", { name: "Ver disponibilidade" }));
    // Envio válido: o formulário da página marca o destino antes de navegar.
    markFocusAfterNavigation("/hotel/1?checkIn=2026-12-20");
    window.history.replaceState(null, "", "/hotel/1?checkIn=2026-12-20");
    rerender(
      <Bar
        keyOf="b"
        criteria={makeSearchCriteria({ checkIn: "2026-12-20", checkOut: "2026-12-22" })}
        summary="20–22 dez · 2 noites · 2 adultos · 1 quarto"
      />,
    );
    expect(screen.getByRole("button", { name: "Alterar datas e hóspedes" })).toHaveAttribute(
      "aria-expanded",
      "false",
    );
    expect(screen.getByRole("heading", { name: "Quartos" })).toHaveFocus();
    window.history.replaceState(null, "", "/");
  });

  it("envio inválido (sem marca) não move o foco quando os critérios mudam depois", async () => {
    const user = userEvent.setup();
    const { rerender } = renderBar();
    await user.click(screen.getByRole("button", { name: "Alterar datas e hóspedes" }));
    await user.click(screen.getByRole("button", { name: "Ver disponibilidade" }));
    window.history.replaceState(null, "", "/hotel/1?checkIn=2026-12-20");
    rerender(
      <Bar
        keyOf="b"
        criteria={makeSearchCriteria({ checkIn: "2026-12-20", checkOut: "2026-12-22" })}
        summary="x"
      />,
    );
    expect(screen.getByRole("heading", { name: "Quartos" })).not.toHaveFocus();
    window.history.replaceState(null, "", "/");
  });

  it("critérios que mudam sem envio (Voltar) não mexem no foco", () => {
    const { rerender } = renderBar();
    rerender(
      <Bar
        keyOf="b"
        criteria={makeSearchCriteria({ checkIn: "2026-12-20", checkOut: "2026-12-22" })}
        summary="x"
      />,
    );
    expect(screen.getByRole("heading", { name: "Quartos" })).not.toHaveFocus();
  });

  it("clique no botão logo depois do envio fechar o painel é ignorado (não reabre)", async () => {
    const user = userEvent.setup();
    const { rerender } = renderBar();
    const toggle = screen.getByRole("button", { name: "Alterar datas e hóspedes" });
    await user.click(toggle);
    rerender(
      <Bar
        keyOf="b"
        criteria={makeSearchCriteria({ checkIn: "2026-12-20", checkOut: "2026-12-22" })}
        summary="x"
      />,
    );
    const after = screen.getByRole("button", { name: "Alterar datas e hóspedes" });
    await user.click(after);
    expect(after).toHaveAttribute("aria-expanded", "false");
  });
});
