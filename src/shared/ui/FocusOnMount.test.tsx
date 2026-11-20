import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { markClientNavigation, resetClientNavigation } from "../lib/client-navigation";
import { FocusOnMount } from "./FocusOnMount";

afterEach(resetClientNavigation);

describe("FocusOnMount", () => {
  it("afterNavigationOnly: na página aberta direto pela URL não foca (sem anel)", () => {
    render(
      <>
        <h1 id="titulo" tabIndex={-1}>
          Título
        </h1>
        <FocusOnMount selector="#titulo" afterNavigationOnly />
      </>,
    );
    expect(screen.getByRole("heading", { name: "Título" })).not.toHaveFocus();
  });

  it("afterNavigationOnly: depois de navegar dentro do app, foca", () => {
    markClientNavigation();
    render(
      <>
        <h1 id="titulo" tabIndex={-1}>
          Título
        </h1>
        <FocusOnMount selector="#titulo" afterNavigationOnly />
      </>,
    );
    expect(screen.getByRole("heading", { name: "Título" })).toHaveFocus();
  });

  it("foca o alvo pelo seletor", () => {
    render(
      <>
        <h1 id="titulo" tabIndex={-1}>
          Título
        </h1>
        <FocusOnMount selector="#titulo" />
      </>,
    );
    expect(screen.getByRole("heading", { name: "Título" })).toHaveFocus();
  });

  it("dá tabindex -1 ao alvo que não é focável", () => {
    render(
      <>
        <h1>Sem tabindex</h1>
        <FocusOnMount selector="h1" />
      </>,
    );
    const heading = screen.getByRole("heading", { name: "Sem tabindex" });
    expect(heading).toHaveAttribute("tabindex", "-1");
    expect(heading).toHaveFocus();
  });

  it("alvo ausente não quebra", () => {
    render(<FocusOnMount selector="#nao-existe" />);
    expect(document.body).toHaveFocus();
  });
});
